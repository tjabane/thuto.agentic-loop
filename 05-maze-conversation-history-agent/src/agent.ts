import type { DecisionClient } from "./decision-client/decision-client-contracts.js";
import type { Tool, ToolResult } from "./tools/tool-contracts.js";

/**
 * Embodies an LLM in a constrained environment.
 *
 * The agent is the only boundary between the LLM and the environment. It owns
 * the conversation history, exposes the body's permitted tools to the LLM,
 * and will coordinate the agent loop and tool-calling loop. It never decides
 * maze outcomes: tools return those outcomes from the environment.
 *
 * This class is intentionally only a contract at this stage. Its dependencies
 * and public operation are declared here without behaviour.
 */
abstract class Agent {
    /**
     * Capabilities available to the embodied agent.
     *
     * Tools are injected dependencies. They define the complete set of
     * interactions the LLM may request; no environment interaction may bypass
     * this list.
     */
    private readonly tools!: readonly Tool[];

    /**
     * Verified environment results accumulated during one agent run.
     *
     * The agent needs no separate history abstraction yet. This ordered list
     * is the body's direct record of what happened and will later be provided
     * to the LLM client as conversation context.
     */
    private readonly toolResults: ToolResult[] = [];

    /**
     * Model-specific dependency that conducts the LLM side of the conversation.
     *
     * The client owns the prompt. The agent supplies it with conversation
     * history and later handles the environment interactions it requests.
     */
    private readonly decisionClient!: DecisionClient;

    /**
     * Runs the embodied-agent control loop.
     *
     * The run loop will:
     *
     * 1. Ask {@link DecisionClient} for the next action; stop if it returns no action.
     * 2. Find and execute the requested tool.
     * 3. Append the verified result to {@link toolResults}.
     * 4. Repeat.
     *
     * This is the agent's only public operation.
     */
    public abstract run(): Promise<void>;
}

export { Agent };
