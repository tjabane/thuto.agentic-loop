import type { VertexId } from "./graph.js";
import type { Direction, NodeInformation } from "./position.js";
import type { Tree } from "./tree.js";

/** Supported actions that an agent can perform. */
const ACTION_TYPES = ["move", "takeKey", "unlockExist", "exit"] as const;

/** The name of a supported agent action. */
type ActionType = (typeof ACTION_TYPES)[number];

/** A validated action that can be performed by the agent. */
type Action =
    | { type: (typeof ACTION_TYPES)[0]; direction: Direction }
    | { type: Exclude<ActionType, (typeof ACTION_TYPES)[0]> };

type AgentState = {
    position: VertexId;
    currentNode?: NodeInformation;
    pathTree: Tree;
    blockedNodes: VertexId[];
    isKeyCollected: boolean;
    existLocation?: VertexId;
    isExistUnlocked: boolean;
};

/** Reason an agent run stopped. */
type RunTerminationReason = "success" | "action_limit";

/** Final outcome and verified state of an agent run. */
type AgentRunResult = {
    terminationReason: RunTerminationReason;
    actionCount: number;
    finalState: AgentState;
};

export {
    ACTION_TYPES,
    type Action,
    type ActionType,
    type AgentRunResult,
    type AgentState,
    type RunTerminationReason,
};
