import type { DecisionClient } from "./decision-client/decision-client-contracts.js";
import { NoResultTool } from "./tools/implementations/no-result-tool.js";
import type { Tool, ToolResult } from "./tools/tool-contracts.js";

/**
 * Embodies an LLM in a constrained environment.
 *
 * The agent is the only boundary between the LLM and the environment. It owns
 * the conversation history, exposes the body's permitted tools to the LLM,
 * and will coordinate the agent loop and tool-calling loop. It never decides
 * maze outcomes: tools return those outcomes from the environment.
 *
 * Tools and the decision client are injected at the composition boundary.
 * The agent dispatches requested capabilities, records their verified results,
 * and stops when the decision client requests no further tool.
 */
class Agent {
    /** Verified environment results accumulated during one agent run. */
    private readonly toolResults: ToolResult[] = [];

    constructor(
        private readonly tools: readonly Tool[],
        private readonly decisionClient: DecisionClient,
    ) {}

    /**
     * Runs until the decision client requests no further tool or the attempt
     * limit is reached.
     *
     * @param attemptCount - Maximum number of requested tool executions.
     */
    public async run(attemptCount: number = 25): Promise<void> {
        if (!Number.isSafeInteger(attemptCount) || attemptCount < 0) {
            throw new RangeError("Attempt count must be a non-negative safe integer.");
        }

        for (let attempt = 0; attempt < attemptCount; attempt += 1) {
            const action = await this.decisionClient.decide(this.toolResults, this.tools);
            if (action === undefined) {
                return;
            }

            const tool = this.tools.find(candidate => candidate.name === action.name);
            const result =
                tool === undefined
                    ? await new NoResultTool(action.name).execute(action.parameters)
                    : await tool.execute(action.parameters);
            this.toolResults.push(result);
        }
    }
}

export { Agent };
