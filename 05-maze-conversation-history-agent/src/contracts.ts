/**
 * Stores the conversation between the LLM and the environment.
 *
 * History will contain LLM interaction requests and their corresponding
 * environment-verified results. It is deliberately not a second model of the
 * maze's hidden state.
 */
interface History {}

/**
 * Represents the LLM-facing dependency used by the agent.
 *
 * The LLM client owns the model-specific prompt and response protocol. The
 * agent will later provide conversation history to it and receive requested
 * environment interactions in return.
 */
interface LLMClient {}

export type { History, LLMClient };
