import {
    Direction,
    Observation,
    Position,
    Action,
    MoveHistory,
    AgentPhase,
    TerminationReason,
    TraversalNode,
} from "./support/types.js";
import { Environment } from "./enviroment.js";
import { makeCellKey } from "./support/maze-utils.js";
import { TraversalRoutePlanner } from "./support/route-planner.js";

class Agent {
    private static readonly MAX_ACTIONS = 25;

    private position: Position;
    private ExistLocation: Position;
    private path: Position[];
    private observations: Set<Observation>;
    private blockedCells: Set<string>;
    private traversalMap: Map<string, TraversalNode>;
    private moveHistory: MoveHistory[];
    private hasKey: boolean;
    private cellHasKey: boolean;
    private cellIsLocked: boolean;
    private isAtExist: boolean;
    private hasExited: boolean;
    private hasUnlockedExit: boolean;
    private IsRunning: boolean;
    private phase: AgentPhase;
    private plannedRoute: Direction[];
    private actionCount: number;
    private terminationReason: TerminationReason | undefined;
    private readonly routePlanner: TraversalRoutePlanner;

    constructor(
        position: Position,
        hasKey: boolean = false,
        routePlanner: TraversalRoutePlanner = new TraversalRoutePlanner(),
    ) {
        this.position = position;
        this.ExistLocation = {x: -1, y: -1};
        this.path = [position];
        this.moveHistory = [];
        this.observations = new Set<Observation>;
        this.blockedCells = new Set<string>();
        this.traversalMap = new Map<string, TraversalNode>();
        this.traversalMap.set(makeCellKey(position), this.createTraversalNode(position));
        this.hasKey = hasKey;
        this.cellHasKey = false;
        this.cellIsLocked = false;
        this.isAtExist = false;
        this.hasExited = false;
        this.hasUnlockedExit = false;
        this.IsRunning = true;
        this.phase = "explore";
        this.plannedRoute = [];
        this.actionCount = 0;
        this.terminationReason = undefined;
        this.routePlanner = routePlanner;
    }

    private createTraversalNode(position: Position): TraversalNode {
        return {
            position: { ...position },
            neighbours: {},
            attemptedDirections: new Set<Direction>(),
            blockedDirections: new Set<Direction>(),
            isExit: false,
        };
    }

    private getOrCreateTraversalNode(position: Position): TraversalNode {
        const key = makeCellKey(position);
        const existingNode = this.traversalMap.get(key);
        if (existingNode) {
            return existingNode;
        }

        const node = this.createTraversalNode(position);
        this.traversalMap.set(key, node);
        return node;
    }

    private updatePhase(): void {
        if (this.hasKey && this.ExistLocation.x !== -1 && this.ExistLocation.y !== -1) {
            if (this.phase !== "exploit") {
                this.phase = "exploit";
                this.plannedRoute = [];
            }
        }
    }

    private observeCell(environment: Environment): void {
        let currentCell = environment.viewCell(this.position);
        this.cellHasKey = currentCell.hasKey;
        this.cellIsLocked = currentCell.isUnlocked;
        this.isAtExist = currentCell.isExit;
        
        this.observations.add(currentCell);
        const currentNode = this.getOrCreateTraversalNode(currentCell.position);
        currentNode.isExit = currentCell.isExit;
        if(currentCell.isExit)
        {
            this.ExistLocation = { ...currentCell.position };
            this.updatePhase();
        }
        
    }

    private think(): Action | undefined {
        if (this.hasKey && this.cellIsLocked && this.isAtExist) {
            return { type: "unlockExit" };
        }
        if (this.hasKey && this.isAtExist && !this.cellIsLocked) {
            return { type: "exit" };
        }
        if (!this.hasKey && this.cellHasKey) {
            return { type: "takeKey" };
        }
        const direction = this.getDirection();
        return direction ? { type: "move", direction } : undefined;
    }

    private getDirection(): Direction | undefined {
        if (this.plannedRoute.length > 0) {
            return this.plannedRoute.shift();
        }

        if (this.phase === "exploit") {
            this.plannedRoute = this.routePlanner.findRouteToPosition(
                this.traversalMap,
                this.position,
                this.ExistLocation,
            ) ?? [];
            return this.plannedRoute.shift();
        }

        const currentNode = this.getOrCreateTraversalNode(this.position);
        const untriedDirections = this.routePlanner.getUntriedDirections(currentNode);
        if (untriedDirections.length > 0) {
            return untriedDirections[Math.floor(Math.random() * untriedDirections.length)];
        }

        this.plannedRoute = this.routePlanner.findRouteToNearestExplorableNode(
            this.traversalMap,
            this.position,
        ) ?? [];
        return this.plannedRoute.shift();
    }

    /**
     * Returns the position of the cell adjacent to the agent's current
     * position in the given direction.
     *
     * The grid's y axis grows downward, so `up` decrements y and `down`
     * increments it. No bounds or wall checking happens here — the returned
     * position may be outside the maze or blocked.
     *
     * @param direction - The direction to step in from the current position.
     * @returns The coordinates of the neighbouring cell.
     */
    private getNeighbour(direction: Direction): Position {
        const currentPosition: Position = this.position;
        const neighbours: Record<Direction, Position> = {
            up: { x: currentPosition.x, y: currentPosition.y - 1 },
            down: { x: currentPosition.x, y: currentPosition.y + 1 },
            left: { x: currentPosition.x - 1, y: currentPosition.y },
            right: { x: currentPosition.x + 1, y: currentPosition.y }
        };

        return neighbours[direction];
    }

    private performAction(action: Action, environment: Environment): void {
        switch (action.type) {
            case "move":
                if (action.direction) {
                    this.Move(action.direction, environment);
                }
                break;
            case "takeKey":
                this.TakeKey(environment);
                break;
            case "unlockExit":
                this.UnlockExit(environment);
                break;
            case "exit":
                this.Exit(environment);
                break;
            default:
                console.log("Unknown action type");
        }
    }

    public Run(enviroment: Environment): void {
        while(this.IsRunning)
        {
            this.observeCell(enviroment);
            if (this.actionCount >= Agent.MAX_ACTIONS) {
                this.finish("safety_limit");
                break;
            }
            const action = this.think();
            if (!action) {
                this.finish("unreachable");
                break;
            }
            this.performAction(action, enviroment);
            this.actionCount++;
        }
    }

    private finish(reason: TerminationReason): void {
        this.IsRunning = false;
        this.phase = "finished";
        this.terminationReason = reason;
        this.plannedRoute = [];
    }

    private Move(direction: Direction, environment: Environment): void {
        const previousPosition = this.position;
        const previousNode = this.getOrCreateTraversalNode(previousPosition);
        previousNode.attemptedDirections.add(direction);
        this.moveHistory.push({ position: this.position, direction: direction });
        const newPosition: Position = environment.changeAgentPosition(direction);
        if(newPosition.x !== -1 && newPosition.y !== -1) {
            console.log(`Moving ${direction} to position (${newPosition.x}, ${newPosition.y})`);
            this.position = newPosition;
            this.path.push(this.position);
            const newNode = this.getOrCreateTraversalNode(newPosition);
            previousNode.neighbours[direction] = { ...newPosition };
            const oppositeDirection = this.getOppositeDirection(direction);
            newNode.neighbours[oppositeDirection] = { ...previousPosition };
            newNode.attemptedDirections.add(oppositeDirection);
        }
        else {
            console.log("Move blocked or out of bounds.");
            this.blockedCells.add(makeCellKey(this.getNeighbour(direction)));
            previousNode.blockedDirections.add(direction);
            this.plannedRoute = [];
        }
    }

    private getOppositeDirection(direction: Direction): Direction {
        const opposites: Record<Direction, Direction> = {
            up: "down",
            down: "up",
            left: "right",
            right: "left",
        };
        return opposites[direction];
    }

    private TakeKey(environment: Environment): void {
        const keyCollected = environment.collectKey(this.position);
        if(keyCollected) {
            this.hasKey = true;
            this.updatePhase();
            console.log("Key collected!");
        }
    }

    private UnlockExit(environment: Environment): void {
        const exitUnlocked = environment.unlockExit(this.position);
        if(exitUnlocked) {
            this.hasUnlockedExit = true;
            console.log("Exit unlocked!");
        }
    }

    private Exit(environment: Environment): void {
        const hasExited = environment.agentExisted(this.position);
        if(hasExited) {
            this.hasExited = true;
            this.finish("success");
            console.log("Agent has exited!");
        }
    }

    public getPhase(): AgentPhase {
        return this.phase;
    }

    public getExitLocation(): Position | undefined {
        if (this.ExistLocation.x === -1 || this.ExistLocation.y === -1) {
            return undefined;
        }
        return { ...this.ExistLocation };
    }

    public getTraversalNode(position: Position): TraversalNode | undefined {
        const node = this.traversalMap.get(makeCellKey(position));
        if (!node) {
            return undefined;
        }
        return {
            position: { ...node.position },
            neighbours: { ...node.neighbours },
            attemptedDirections: new Set(node.attemptedDirections),
            blockedDirections: new Set(node.blockedDirections),
            isExit: node.isExit,
        };
    }

    public getTerminationReason(): TerminationReason | undefined {
        return this.terminationReason;
    }

    public getActionCount(): number {
        return this.actionCount;
    }
}

export { Agent };
