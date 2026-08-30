import type { Enviroment } from "../../enviroment.js";
import type { Tool, ToolResult } from "../tool-contracts.js";
import { EMPTY_TOOL_INPUT_SCHEMA, isValidToolInput } from "../schemas.js";

class TakeKeyTool implements Tool {
    public readonly name = "take_key";
    public readonly description = "Collect the key at the agent's current location.";
    public readonly inputSchema = EMPTY_TOOL_INPUT_SCHEMA;

    constructor(private readonly enviroment: Enviroment) {}

    public async execute(input: unknown): Promise<ToolResult> {
        if (!isValidToolInput(input, this.inputSchema)) {
            return { success: false, message: "Taking the key does not accept arguments." };
        }

        const success = this.enviroment.takeKey();
        return {
            success,
            message: success ? "Key collected." : "No uncollected key is at the current location.",
        };
    }
}

export { TakeKeyTool };
