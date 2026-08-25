import type { Enviroment } from "../../../04-maze-llm-agent/src/enviroment.js";
import {
    DIRECTIONS,
    type Direction,
} from "../../../04-maze-llm-agent/src/models/position.js";

import type { Tool } from "./tool.js";

const EMPTY_INPUT_SCHEMA = {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
} as const;

const MOVE_INPUT_SCHEMA = {
    type: "object",
    properties: {
        direction: {
            type: "string",
            enum: DIRECTIONS,
        },
    },
    required: ["direction"],
    additionalProperties: false,
} as const;

type MoveInput = { direction: Direction };

function isEmptyInput(input: unknown): boolean {
    return (
        typeof input === "object" &&
        input !== null &&
        Object.keys(input).length === 0
    );
}

function isMoveInput(input: unknown): input is MoveInput {
    if (typeof input !== "object" || input === null) {
        return false;
    }

    const candidate = input as Record<string, unknown>;
    return (
        Object.keys(candidate).length === 1 &&
        DIRECTIONS.some((direction) => direction === candidate.direction)
    );
}

/** Exposes the selected maze environment behaviours as model-callable tools. */
function createMazeTools(enviroment: Enviroment): Tool[] {
    return [
        {
            name: "inspect",
            description: "Inspect the maze node at the current position.",
            inputSchema: EMPTY_INPUT_SCHEMA,
            execute(input) {
                if (!isEmptyInput(input)) {
                    return {
                        success: false,
                        error: "inspect does not accept arguments",
                    };
                }

                return {
                    success: true,
                    output: enviroment.inspectCurrentNode(),
                };
            },
        },
        {
            name: "move",
            description: "Attempt to move one node in the given direction.",
            inputSchema: MOVE_INPUT_SCHEMA,
            execute(input) {
                if (!isMoveInput(input)) {
                    return {
                        success: false,
                        error: "move requires one valid direction",
                    };
                }

                const before = enviroment.getState().agentPostion;
                const position = enviroment.move(input.direction);
                const moved =
                    before.x !== position.x || before.y !== position.y;

                return {
                    success: true,
                    output: { moved, position },
                };
            },
        },
        {
            name: "takeKey",
            description: "Attempt to take the key at the current position.",
            inputSchema: EMPTY_INPUT_SCHEMA,
            execute(input) {
                if (!isEmptyInput(input)) {
                    return {
                        success: false,
                        error: "takeKey does not accept arguments",
                    };
                }

                return {
                    success: true,
                    output: { keyTaken: enviroment.takeKey() },
                };
            },
        },
        {
            name: "unlockExit",
            description: "Attempt to unlock the exit at the current position.",
            inputSchema: EMPTY_INPUT_SCHEMA,
            execute(input) {
                if (!isEmptyInput(input)) {
                    return {
                        success: false,
                        error: "unlockExit does not accept arguments",
                    };
                }

                return {
                    success: true,
                    output: { exitUnlocked: enviroment.unlockExist() },
                };
            },
        },
    ];
}

export { createMazeTools };
