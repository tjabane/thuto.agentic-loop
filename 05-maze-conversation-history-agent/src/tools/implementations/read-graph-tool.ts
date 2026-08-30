import { EMPTY_TOOL_INPUT_SCHEMA, isValidToolInput } from "../schemas.js";
import type { Tool, ToolResult } from "../tool-contracts.js";
import type { GraphReader } from "./graph-tool.js";

/** Returns the accumulated graph without changing it. */
class ReadGraphTool implements Tool {
    public readonly name = "read_graph";
    public readonly description = "Return the full discovered graph without changing it.";
    public readonly inputSchema = EMPTY_TOOL_INPUT_SCHEMA;

    constructor(private readonly graph: GraphReader) {}

    public async execute(input: unknown): Promise<ToolResult> {
        if (!isValidToolInput(input, this.inputSchema)) {
            return {
                success: false,
                message: "Reading the graph does not accept arguments.",
            };
        }

        return {
            success: true,
            message: "Current graph retrieved.",
            data: this.graph.read(),
        };
    }
}

export { ReadGraphTool };
