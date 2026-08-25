import type OpenAI from "openai";

import type { ILLMClient } from "./llm/client.js";
import type { Tool, ToolResult } from "./tools/tool.js";

/**
 * Runs a model-driven conversation in which environment capabilities are
 * exposed as tools and their verified results become conversation context.
 */
class Agent {
    /** Model-facing memory accumulated during the current run. */
    private context: OpenAI.Responses.ResponseInput;

    /** Environment tools available to the model and execution harness. */
    private tools: Tool[];

    /** Client used to request model responses. */
    private readonly llmClient: ILLMClient;

    /**
     * Creates an agent with an initial system instruction and a set of tools.
     *
     * @param systemPrompt - Stable instructions that govern the conversation.
     * @param tools - Environment capabilities the model may request.
     * @param llmClient - Model client used to continue the conversation.
     */
    constructor(systemPrompt: string, tools: Tool[], llmClient: ILLMClient) {
        this.tools = tools;
        this.llmClient = llmClient;
        this.context = [
            {
                role: "system",
                content: systemPrompt,
            },
        ];
    }

    /**
     * Continues the conversation until the model returns without requesting a
     * tool or the configured turn limit is reached.
     *
     * Each requested tool is located by name, executed by the harness, and
     * returned to the model as a verified function-call output.
     *
     * @param maxTurns - Maximum number of model responses permitted.
     * @returns The model's final textual response.
     * @throws {RangeError} When `maxTurns` is not a positive integer.
     * @throws {Error} When the model does not finish within `maxTurns`.
     */
    public async run(maxTurns = 25): Promise<string> {
        if (!Number.isInteger(maxTurns) || maxTurns <= 0) {
            throw new RangeError("maxTurns must be a positive integer");
        }

        const toolDescriptions: OpenAI.Responses.FunctionTool[] =
            this.tools.map((tool) => ({
                type: "function",
                name: tool.name,
                description: tool.description,
                parameters: tool.inputSchema,
                strict: true,
            }));

        for (let turn = 0; turn < maxTurns; turn += 1) {
            if (process.env.LOG_AGENT_CONTEXT === "true") {
                console.log(
                    `Agent context before turn ${turn + 1}:\n${JSON.stringify(this.context, null, 2)}`,
                );
            }

            const response = await this.llmClient.getResponse(
                this.context,
                toolDescriptions,
            );

            this.context.push(...response.output);

            const toolCall = response.output.find(
                (item) => item.type === "function_call",
            );

            if (toolCall === undefined) {
                return response.outputText;
            }

            const tool = this.tools.find(
                (candidate) => candidate.name === toolCall.name,
            );

            let result: ToolResult;

            if (tool === undefined) {
                result = {
                    success: false,
                    error: `Unknown tool: ${toolCall.name}`,
                };
            } else {
                try {
                    const input: unknown = JSON.parse(toolCall.arguments);
                    result = await tool.execute(input);
                } catch (error) {
                    result = {
                        success: false,
                        error:
                            error instanceof Error
                                ? error.message
                                : "Tool execution failed",
                    };
                }
            }

            this.context.push({
                type: "function_call_output",
                call_id: toolCall.call_id,
                output: JSON.stringify(result),
            });
        }

        throw new Error("Maximum number of turns reached");
    }
}

export { Agent };
