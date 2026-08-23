import type { Enviroment } from "./enviroment.js";
import type { ActionPlanner } from "./llm/planner.js";
import type {
    Action,
    AgentRunResult,
    AgentState,
} from "./models/agent-utils.js";
import { parseVertexId, type VertexId, vertexId } from "./models/graph.js";
import type { Direction } from "./models/position.js";
import { Tree } from "./models/tree.js";

/** An agent that incrementally learns and navigates a maze. */
class Agent {
    pathTree: Tree;
    blockedNodes: Set<VertexId>;
    position: VertexId;
    existLocation: VertexId | undefined;
    isKeyCollected: boolean;
    isExistUnlocked: boolean;
    hasExistedMaze: boolean;

    /**
     * Creates an agent that delegates decisions to the supplied planner.
     *
     * @param planner - Planner used to select the agent's next action.
     */
    constructor(private readonly planner: ActionPlanner) {
        this.pathTree = new Tree();
        this.blockedNodes = new Set<VertexId>();
        this.position = "0,0";
        this.existLocation = undefined;
        this.isKeyCollected = false;
        this.isExistUnlocked = false;
        this.hasExistedMaze = false;
    }

    /**
     * Inspects the current maze node and updates the agent's verified state.
     *
     * @param enviroment - The maze environment to inspect.
     */
    private observe(enviroment: Enviroment): void {
        const observation = enviroment.inspectCurrentNode();
        this.position = vertexId(
            observation.position.x,
            observation.position.y,
        );
        this.pathTree.addVertex(this.position);

        if (observation.hasExit) {
            this.existLocation = this.position;
            this.isExistUnlocked = !observation.isExitLocked;
        }
    }

    /** Creates an independent snapshot of the agent's verified knowledge. */
    private getStateSnapshot(): AgentState {
        return {
            position: this.position,
            pathTree: this.pathTree.clone(),
            blockedNodes: [...this.blockedNodes],
            isKeyCollected: this.isKeyCollected,
            isExistUnlocked: this.isExistUnlocked,
            ...(this.existLocation === undefined
                ? {}
                : { existLocation: this.existLocation }),
        };
    }

    /**
     * Runs the perceive-plan-act loop until success or the action limit.
     *
     * @param enviroment - The maze environment to explore.
     * @param maxActions - Maximum number of environment actions permitted.
     * @returns The termination reason, action count, and final known state.
     * @throws {RangeError} When `maxActions` is not a positive integer.
     */
    public async run(
        enviroment: Enviroment,
        maxActions = 25,
    ): Promise<AgentRunResult> {
        if (!Number.isInteger(maxActions) || maxActions <= 0) {
            throw new RangeError("maxActions must be a positive integer.");
        }

        let actionCount = 0;

        while (!this.hasExistedMaze && actionCount < maxActions) {
            this.observe(enviroment);
            const action = await this.planner.plan(this.getStateSnapshot());
            this.performAction(action, enviroment);
            actionCount += 1;
        }

        return {
            terminationReason: this.hasExistedMaze ? "success" : "action_limit",
            actionCount,
            finalState: this.getStateSnapshot(),
        };
    }

    /**
     * Applies an already selected action to the environment.
     *
     * @param action - The action selected during the planning step.
     * @param enviroment - The maze environment in which to act.
     */
    private performAction(action: Action, enviroment: Enviroment): void {
        if (this.hasExistedMaze) {
            return;
        }

        switch (action.type) {
            case "move":
                this.move(action.direction, enviroment);
                break;
            case "takeKey":
                this.takeKey(enviroment);
                break;
            case "unlockExist":
                this.unlockExist(enviroment);
                break;
            case "exit":
                this.exist();
                break;
        }
    }

    /**
     * Attempts to move and records either a traversable edge or blocked node.
     *
     * @param direction - The direction in which to move.
     * @param enviroment - The maze environment in which to move.
     */
    private move(direction: Direction, enviroment: Enviroment): void {
        const previousPosition = this.position;
        const attemptedPosition = this.getNeighbour(
            previousPosition,
            direction,
        );
        const result = enviroment.move(direction);
        const nextPosition = vertexId(result.x, result.y);

        if (nextPosition === previousPosition) {
            this.blockedNodes.add(attemptedPosition);
            return;
        }

        this.position = nextPosition;
        this.pathTree.addTraversal(previousPosition, nextPosition);
    }

    /**
     * Takes the key and records a successful collection.
     *
     * @param enviroment - The maze environment containing the key.
     */
    private takeKey(enviroment: Enviroment): void {
        if (enviroment.takeKey()) {
            this.isKeyCollected = true;
        }
    }

    /**
     * Unlocks the exit when the environment confirms the action succeeded.
     *
     * @param enviroment - The maze environment containing the exit.
     */
    private unlockExist(enviroment: Enviroment): void {
        if (enviroment.unlockExist()) {
            this.existLocation = this.position;
            this.isExistUnlocked = true;
        }
    }

    /** Marks the run complete when the agent is on the unlocked exit. */
    private exist(): void {
        if (this.isExistUnlocked && this.existLocation === this.position) {
            this.hasExistedMaze = true;
        }
    }

    /** Returns the node adjacent to a vertex in the requested direction. */
    private getNeighbour(position: VertexId, direction: Direction): VertexId {
        const { x, y } = parseVertexId(position);
        const offsets: Record<Direction, readonly [number, number]> = {
            up: [0, -1],
            down: [0, 1],
            left: [-1, 0],
            right: [1, 0],
        };
        const [deltaX, deltaY] = offsets[direction];

        return `${x + deltaX},${y + deltaY}`;
    }
}

export { type Action, Agent };
