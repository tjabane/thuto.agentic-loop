import type { Tool, ToolResult } from "../tools/tool-contracts.js";

/** A requested tool call selected by the decision-maker. */
type Action = {
    /** Provider-assigned identifier for this specific tool invocation. */
    readonly id: string;

    /** Stable name of the requested tool. */
    readonly name: string;

    /** Raw arguments supplied by the decision provider. */
    readonly parameters: unknown;
};

/** Chooses the agent body's next action from verified experience. */
interface DecisionClient {
    /**
     * Selects the next action for the agent body to take.
     *
     * @param context - Ordered, environment-verified results from prior tool
     * interactions in the current run.
     * @param tools - Capabilities currently available to the agent body.
     * @returns The next requested tool call, or `undefined` when no tool is
     * requested and the agent run is complete.
     */
    decide(
        context: readonly ToolResult[],
        tools: readonly Tool[],
    ): Promise<Action | undefined>;
}

export type { Action, DecisionClient };
