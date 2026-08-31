import type { Enviroment } from "../../enviroment.js";
import type { Tool, ToolResult } from "../tool-contracts.js";
import { EMPTY_TOOL_INPUT_SCHEMA, isValidToolInput } from "../schemas.js";

class UnlockExitTool implements Tool {
    public readonly name = "unlock_exit";
    public readonly description = "Unlock the exit while standing on it with the key.";
    public readonly inputSchema = EMPTY_TOOL_INPUT_SCHEMA;

    constructor(private readonly enviroment: Enviroment) {}

    public async execute(input: unknown): Promise<ToolResult> {
        if (!isValidToolInput(input, this.inputSchema)) {
            return { success: false, message: "Unlocking the exit does not accept arguments." };
        }

        const success = this.enviroment.unlockExist();
        return {
            success,
            message: success ? "Exit unlocked." : "The exit could not be unlocked here.",
        };
    }
}

export { UnlockExitTool };
