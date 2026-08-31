import type { Tool, ToolResult } from "../tool-contracts.js";
import { EMPTY_TOOL_INPUT_SCHEMA } from "../schemas.js";

/** Represents a requested capability that is not available to the agent. */
class NoResultTool implements Tool {
    public readonly description = "Represents an unavailable tool request.";
    public readonly inputSchema = EMPTY_TOOL_INPUT_SCHEMA;

    constructor(public readonly name: string) {}

    public async execute(_input: unknown): Promise<ToolResult> {
        return {
            success: false,
            message: `Requested tool "${this.name}" is unavailable.`,
        };
    }
}

export { NoResultTool };
