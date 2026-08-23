import { format } from "node:util";

import type { Action, AgentState } from "../models/agent-utils.js";
import type { Edge, VertexId } from "../models/graph.js";
import type { NodeInformation } from "../models/position.js";
import type { ILLMClient } from "./client.js";

/** Serializable agent knowledge included in the model prompt. */
type PlanningState = {
    position: VertexId;
    currentNode: NodeInformation | null;
    knownTree: {
        vertices: VertexId[];
        edges: Edge[];
    };
    blockedNodes: VertexId[];
    isKeyCollected: boolean;
    knownExitLocation: VertexId | null;
    isExitUnlocked: boolean;
};

/** Contract for selecting the agent's next action from its known state. */
interface ActionPlanner {
    /**
     * Selects the next maze action.
     *
     * @param state - A snapshot of information legitimately known by the agent.
     * @returns The next validated action.
     */
    plan(state: AgentState): Promise<Action>;
}

/** Uses an LLM client to select the next maze action. */
class LlmActionPlanner implements ActionPlanner {
    /** Prompt template populated with verified state and available actions. */
    private readonly prompt: string =
        `You control an agent exploring an unknown 3x3 maze.
        Choose exactly one next action using only the verified state below.
        The goal is to collect the key, find and unlock the exit, then exit the maze.
        Do not assume that an unknown node is traversable or blocked.
        Avoid repeating a movement toward a known blocked node.
        Use takeKey, unlockExist, or exit only when the current state supports it.

        Verified agent state:
        %s

        Available actions:
        %s`;

    /**
     * Creates an LLM-backed action planner.
     *
     * @param client - Client used to request a structured action from the model.
     */
    constructor(private readonly client: ILLMClient) {}

    /** {@inheritDoc ActionPlanner.plan} */
    async plan(state: AgentState): Promise<Action> {
        const actions: Action[] = this.getAvailableActions();
        const prompt: string = this.getAgentPrompt(state, actions);

        return this.client.getNextAction(prompt);
    }

    /** Returns every action shape the model may select. */
    private getAvailableActions(): Action[] {
        return [
            { type: "move", direction: "up" },
            { type: "move", direction: "down" },
            { type: "move", direction: "left" },
            { type: "move", direction: "right" },
            { type: "takeKey" },
            { type: "unlockExist" },
            { type: "exit" },
        ];
    }

    /**
     * Builds the instructions and verified state presented to the model.
     *
     * @param state - Information currently known by the agent.
     * @param actions - Exact actions from which the model may choose.
     * @returns The complete maze-planning prompt.
     */
    private getAgentPrompt(state: AgentState, actions: Action[]): string {
        const planningState: PlanningState = {
            position: state.position,
            currentNode: state.currentNode ?? null,
            knownTree: {
                vertices: [...state.pathTree.vertices],
                edges: [...state.pathTree.edges],
            },
            blockedNodes: [...state.blockedNodes],
            isKeyCollected: state.isKeyCollected,
            knownExitLocation: state.existLocation ?? null,
            isExitUnlocked: state.isExistUnlocked,
        };

        return format(
            this.prompt,
            JSON.stringify(planningState, null, 2),
            JSON.stringify(actions, null, 2),
        );
    }
}

export { type ActionPlanner, LlmActionPlanner };
