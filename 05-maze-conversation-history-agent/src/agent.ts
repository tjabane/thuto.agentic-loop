import OpenAI from "openai";

import type { Tool, ToolResult } from "./tools/tool.js";

/**
 * Runs a model-driven conversation in which environment capabilities are
 * exposed as tools and their verified results become conversation context.
 */
class Agent {
    /** Model-facing memory accumulated during the current run. */
    private context: OpenAI.Responses.ResponseInput;

    /** OpenAI model used to select tool calls and produce the final response. */
    private model: string;

    /** Environment tools available to the model and execution harness. */
    private tools: Tool[];

    /** Client used to request model responses. */
    private readonly llmClient: OpenAI;

    /**
     * Creates an agent with an initial system instruction and a set of tools.
     *
     * @param systemPrompt - Stable instructions that govern the conversation.
     * @param tools - Environment capabilities the model may request.
     * @param model - OpenAI model used for each turn.
     */
    constructor(systemPrompt: string, tools: Tool[], model = "gpt-5") {
        this.tools = tools;
        this.model = model;
        this.llmClient = new OpenAI();
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
            const response = await this.llmClient.responses.create({
                model: this.model,
                input: this.context,
                tools: toolDescriptions,
                tool_choice: "auto",
                parallel_tool_calls: false,
                store: false,
            });

            for (const item of response.output) {
                if (
                    item.type === "message" ||
                    item.type === "reasoning" ||
                    item.type === "function_call"
                ) {
                    this.context.push(item);
                }
            }

            const toolCall = response.output.find(
                (item) => item.type === "function_call",
            );

            if (toolCall === undefined) {
                return response.output_text;
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
