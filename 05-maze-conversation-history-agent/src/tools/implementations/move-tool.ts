import type { Enviroment } from "../../enviroment.js";
import type { Direction, Position } from "../../models/position.js";
import type { Tool, ToolResult } from "../tool-contracts.js";
import { isValidToolInput, MOVE_TOOL_INPUT_SCHEMA } from "../schemas.js";

class MoveTool implements Tool {
    public readonly name = "move";
    public readonly description = "Move the agent one cell in a cardinal direction.";
    public readonly inputSchema = MOVE_TOOL_INPUT_SCHEMA;

    constructor(private readonly enviroment: Enviroment) {}

    public async execute(input: unknown): Promise<ToolResult> {
        if (!isValidToolInput(input, this.inputSchema)) {
            return invalidInputResult("Move requires exactly one valid direction.");
        }

        const previousPosition = this.enviroment.getState().agentPostion;
        const position = this.enviroment.move(input.direction as Direction);
        const moved = !positionsMatch(previousPosition, position);

        return {
            success: moved,
            message: moved ? "Agent moved successfully." : "Agent could not move in that direction.",
            data: { position },
        };
    }
}

function positionsMatch(left: Position, right: Position): boolean {
    return left.x === right.x && left.y === right.y;
}

function invalidInputResult(message: string): ToolResult {
    return { success: false, message };
}

export { MoveTool };
