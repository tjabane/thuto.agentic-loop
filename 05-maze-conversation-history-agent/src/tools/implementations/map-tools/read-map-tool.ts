import type { MazeMap } from "../../../map/map-contracts.js";
import { EMPTY_TOOL_INPUT_SCHEMA, isValidToolInput } from "../../schemas.js";
import type { Tool, ToolResult } from "../../tool-contracts.js";

/** Returns the discovered maze map without changing it. */
class ReadMapTool implements Tool {
    public readonly name = "read_map";
    public readonly description = "Return the full discovered map without changing it.";
    public readonly inputSchema = EMPTY_TOOL_INPUT_SCHEMA;

    constructor(private readonly map: MazeMap) {}

    public async execute(input: unknown): Promise<ToolResult> {
        if (!isValidToolInput(input, this.inputSchema)) {
            return { success: false, message: "Reading the map does not accept arguments." };
        }
        return {
            success: true,
            message: "Current map retrieved.",
            data: this.map.readMap(),
        };
    }
}

export { ReadMapTool };
