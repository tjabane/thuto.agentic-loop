import OpenAI from "openai";

import type {
    Tool,
    ToolInputSchema,
    ToolResult,
} from "../tools/tool-contracts.js";
import type { Action, DecisionClient } from "./decision-client-contracts.js";


/** Configuration for {@link OpenAiDecisionClient}. */
interface OpenAiDecisionClientOptions {
    /** OpenAI API key. Defaults to the `OPENAI_API_KEY` environment variable. */
    readonly apiKey?: string;

    /** Model used to select the next tool. */
    readonly model?: string;

    /** Optional API client override, primarily for isolated tests. */
    readonly client?: Pick<OpenAI, "responses">;
}

/** OpenAI Responses API implementation of the decision-client boundary. */
class OpenAiDecisionClient implements DecisionClient {
    private readonly client: Pick<OpenAI, "responses">;
    private readonly systemPrompt: string;
    private readonly model: string;

    constructor(options: OpenAiDecisionClientOptions = {}, systemPrompt:string, model:string = "gpt-5.6-luna") {
        this.client =
            options.client ??
            new OpenAI(options.apiKey === undefined ? {} : { apiKey: options.apiKey });
        this.model = options.model ?? process.env.OPENAI_MODEL ?? model;
        this.systemPrompt = systemPrompt;
    }

    public async decide(
        context: readonly ToolResult[],
        tools: readonly Tool[],
    ): Promise<Action | undefined> {
        const response = await this.client.responses.create({
            model: this.model,
            instructions: this.systemPrompt,
            input: JSON.stringify({ verifiedToolResults: context }),
            tools: tools.map(OpenAiDecisionClient.toOpenAiFunctionTool),
            parallel_tool_calls: false,
            tool_choice: "auto",
            store: false,
        });

        const functionCalls = response.output.filter(
            output => output.type === "function_call",
        );

        if (functionCalls.length === 0) {
            return undefined;
        }

        if (functionCalls.length > 1) {
            throw new Error("The decision provider requested multiple tools in one turn.");
        }

        const [functionCall] = functionCalls;
        if (functionCall === undefined) {
            throw new Error("The decision provider did not return a tool call.");
        }

        return {
            id: functionCall.call_id,
            name: functionCall.name,
            parameters: OpenAiDecisionClient.parseArguments(functionCall.arguments),
        };
    }

    private static parseArguments(argumentsJson: string): unknown {
        try {
            return JSON.parse(argumentsJson);
        } catch {
            throw new Error("The decision provider returned invalid tool arguments.");
        }
    }

    private static toOpenAiFunctionTool(tool: Tool) {
        return {
            type: "function" as const,
            name: tool.name,
            description: tool.description,
            parameters: OpenAiDecisionClient.toOpenAiJsonSchema(tool.inputSchema),
            strict: true,
        };
    }

    private static toOpenAiJsonSchema(schema: ToolInputSchema): Record<string, unknown> {
        const properties = Object.fromEntries(
            Object.entries(schema.properties).map(([name, property]) => [
                name,
                OpenAiDecisionClient.toOpenAiPropertySchema(property),
            ]),
        );

        return {
            type: schema.type,
            properties,
            ...(schema.required === undefined ? {} : { required: schema.required }),
            additionalProperties: schema.additionalProperties,
        };
    }

    private static toOpenAiPropertySchema(property: ToolInputSchema["properties"][string]): Record<string, unknown> {
        if (property.type === "array") {
            return {
                type: property.type,
                items: {
                    type: property.items.type,
                    ...(property.items.enum === undefined ? {} : { enum: property.items.enum }),
                },
            };
        }

        return {
            type: property.type,
            ...(property.enum === undefined ? {} : { enum: property.enum }),
        };
    }
}

export { OpenAiDecisionClient, type OpenAiDecisionClientOptions };
