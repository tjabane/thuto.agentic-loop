import type { Enviroment } from "../../enviroment.js";
import type { Tool, ToolResult } from "../tool-contracts.js";
import { EMPTY_TOOL_INPUT_SCHEMA, isValidToolInput } from "../schemas.js";

class GetStateTool implements Tool {
    public readonly name = "get_state";
    public readonly description = "Return the current maze state.";
    public readonly inputSchema = EMPTY_TOOL_INPUT_SCHEMA;

    constructor(private readonly enviroment: Enviroment) {}

    public async execute(input: unknown): Promise<ToolResult> {
        if (!isValidToolInput(input, this.inputSchema)) {
            return { success: false, message: "Getting state does not accept arguments." };
        }

        return { success: true, message: "Current maze state retrieved.", data: this.enviroment.getState() };
    }
}

export { GetStateTool };
