import OpenAI from "openai";

import {
    ACTION_TYPES,
    type Action,
    type ActionType,
} from "../models/agent-utils.js";
import { DIRECTIONS, type Direction } from "../models/position.js";

/** Contract used by an action planner to request a model-selected action. */
interface ILLMClient {
    /**
     * Sends a planning prompt to the model and returns its validated action.
     *
     * @param prompt - The agent state and instructions presented to the model.
     * @returns The next action selected by the model.
     * @throws {Error} When the model returns an empty or invalid action.
     */
    getNextAction(prompt: string): Promise<Action>;
}

/** Configuration for {@link LLMClient}. */
interface LLMClientOptions {
    /** OpenAI API key. Defaults to the `OPENAI_API_KEY` environment variable. */
    apiKey?: string;

    /** Model used to choose maze actions. */
    model?: string;

    /** Optional OpenAI client override, primarily for isolated tests. */
    client?: Pick<OpenAI, "responses">;
}

/** Raw action shape required from the model's structured response. */
interface ModelAction {
    type: ActionType;
    direction: Direction | null;
}

/** OpenAI-backed client that requests strictly structured maze actions. */
class LLMClient implements ILLMClient {
    private readonly client: Pick<OpenAI, "responses">;
    private readonly model: string;

    /**
     * Creates an OpenAI LLM client.
     *
     * @param options - API, model, and dependency configuration.
     */
    constructor(options: LLMClientOptions = {}) {
        this.client =
            options.client ??
            new OpenAI(options.apiKey ? { apiKey: options.apiKey } : {});
        this.model =
            options.model ?? process.env.OPENAI_MODEL ?? "gpt-5.6-luna";
    }

    /** {@inheritDoc ILLMClient.getNextAction} */
    async getNextAction(prompt: string): Promise<Action> {
        if (prompt.trim().length === 0) {
            throw new TypeError("The planning prompt cannot be empty.");
        }

        const response = await this.client.responses.create({
            model: this.model,
            input: prompt,
            store: false,
            text: {
                format: {
                    type: "json_schema",
                    name: "maze_action",
                    description:
                        "The next action the maze agent should perform.",
                    strict: true,
                    schema: {
                        type: "object",
                        properties: {
                            type: {
                                type: "string",
                                enum: ACTION_TYPES,
                            },
                            direction: {
                                anyOf: [
                                    {
                                        type: "string",
                                        enum: DIRECTIONS,
                                    },
                                    { type: "null" },
                                ],
                            },
                        },
                        required: ["type", "direction"],
                        additionalProperties: false,
                    },
                },
            },
        });

        if (response.output_text.length === 0) {
            throw new Error("The model returned an empty action.");
        }

        return this.parseAction(response.output_text);
    }

    /** Parses and validates a structured model action. */
    private parseAction(output: string): Action {
        let value: unknown;

        try {
            value = JSON.parse(output);
        } catch {
            throw new Error("The model returned invalid action JSON.");
        }

        if (!this.isModelAction(value)) {
            throw new Error("The model returned an invalid action shape.");
        }

        if (value.type === "move") {
            if (value.direction === null) {
                throw new Error("A move action requires a direction.");
            }

            return { type: "move", direction: value.direction };
        }

        if (value.direction !== null) {
            throw new Error("Only move actions may include a direction.");
        }

        return { type: value.type };
    }

    /** Determines whether an unknown value has the model action shape. */
    private isModelAction(value: unknown): value is ModelAction {
        if (typeof value !== "object" || value === null) {
            return false;
        }

        const candidate = value as Record<string, unknown>;
        return (
            Object.keys(candidate).length === 2 &&
            ACTION_TYPES.some((type) => type === candidate.type) &&
            (candidate.direction === null ||
                DIRECTIONS.some(
                    (direction) => direction === candidate.direction,
                ))
        );
    }
}

export { type ILLMClient, LLMClient, type LLMClientOptions };
