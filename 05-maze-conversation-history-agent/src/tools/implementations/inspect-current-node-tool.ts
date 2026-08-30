import type { Enviroment } from "../../enviroment.js";
import type { Tool, ToolResult } from "../tool-contracts.js";
import { EMPTY_TOOL_INPUT_SCHEMA, isValidToolInput } from "../schemas.js";

class InspectCurrentNodeTool implements Tool {
    public readonly name = "inspect_current_node";
    public readonly description = "Inspect the maze node at the agent's current location.";
    public readonly inputSchema = EMPTY_TOOL_INPUT_SCHEMA;

    constructor(private readonly enviroment: Enviroment) {}

    public async execute(input: unknown): Promise<ToolResult> {
        if (!isValidToolInput(input, this.inputSchema)) {
            return { success: false, message: "Inspecting the current node does not accept arguments." };
        }

        return {
            success: true,
            message: "Current node inspected.",
            data: this.enviroment.inspectCurrentNode(),
        };
    }
}

export { InspectCurrentNodeTool };
