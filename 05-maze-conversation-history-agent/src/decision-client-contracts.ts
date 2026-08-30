import type { Tool, ToolResult } from "./tools/tool-contracts.js";

/**
 * A requested tool call selected by the decision-maker.
 *
 * An action exists only when the decision-maker requests a tool. It remains
 * provider-neutral: it describes what the agent body should do next, not a
 * response from a particular model API.
 */
type Action = {
    /**
     * Opaque correlation identifier for this specific tool invocation.
     *
     * The decision provider assigns this value to distinguish one request from
     * another. The agent must preserve it unchanged when it records the
     * verified tool result, allowing the decision client to associate that
     * result with the request that caused it. This does not identify the tool;
     * {@link name} does that.
     */
    readonly id: string;


    readonly name: string;

    /**
     * Raw arguments supplied for the requested tool.
     *
     * The values are untrusted until the selected tool validates them against
     * its input schema.
     */
    readonly parameters: unknown;
};

/**
 * Chooses the agent body's next action from its verified experience.
 *
 * This dependency owns the prompt, model/provider protocol, and serialisation
 * of available tools. The agent supplies only its accumulated tool results and
 * body capabilities; it receives one provider-neutral action in return.
 */
interface DecisionClient {
    /**
     * Selects the next action for the agent body to take.
     *
     * @param context - Ordered, environment-verified results from prior tool
     * interactions in the current run.
     * @param tools - Capabilities currently available to the agent body. The
     * client serialises their name, description, and input schema for its
     * model provider.
     * @returns The next requested tool call, or `undefined` when the model
     * requested no tool calls and the agent run is complete.
     */
    decide(
        context: readonly ToolResult[],
        tools: readonly Tool[],
    ): Promise<Action | undefined>;
}

export type { Action, DecisionClient };
