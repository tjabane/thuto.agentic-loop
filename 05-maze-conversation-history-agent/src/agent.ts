import type { History, LLMClient } from "./contracts.js";
import type { Tool } from "./tool-contracts.js";

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
     * The conversation state for one agent run.
     *
     * This history records only the LLM's requests and verified environment
     * results, allowing the LLM to reason from what the body has experienced.
     */
    private readonly history!: History;

    /**
     * Model-specific dependency that conducts the LLM side of the conversation.
     *
     * The client owns the prompt. The agent supplies it with conversation
     * history and later handles the environment interactions it requests.
     */
    private readonly llmClient!: LLMClient;

    /**
     * Runs the embodied-agent control loop.
     *
     * A future implementation will repeatedly obtain an LLM response, execute
     * each requested tool through the environment, append verified results to
     * history, and stop when the conversation reaches its terminal condition.
     *
     * This is the agent's only public operation.
     */
    public abstract run(): Promise<void>;
}

export { Agent };
