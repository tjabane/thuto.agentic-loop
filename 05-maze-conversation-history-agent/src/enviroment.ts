import type {Direction, NodeInformation, Position, State} from "./models/position.js";

/**
 * Represents the maze in which an agent searches for a key and an exit.
 *
 * The environment tracks the maze dimensions, blocked positions, the agent's
 * current position, and whether the key has been collected and the exit has
 * been unlocked.
 */
class Enviroment {
    /** The length of one side of the square maze. */
    private readonly size: number;

    /** The position at which the key can be collected. */
    private readonly keyPosition: Position;

    /** The position of the maze exit. */
    private readonly existPosition: Position;

    /** Positions that the agent cannot enter. */
    private readonly blockedNodes: Set<Position>

    /** The agent's current position in the maze. */
    private agentPostion: Position;

    /** Indicates whether the agent has collected the key. */
    private isKeyTaken: boolean

    /** Indicates whether the exit is currently locked. */
    private isExistLocked: boolean

    /**
     * Creates a maze environment with the agent initially positioned at
     * coordinates `(0, 0)`.
     *
     * @param gridLength - The length of one side of the square maze.
     * @param keyPosition - The position of the key.
     * @param existPosition - The position of the exit.
     * @param blockedNodes - Positions that the agent cannot enter.
     */
    constructor(gridLength: number, keyPosition: Position, existPosition: Position, blockedNodes: Set<Position>){
        this.size = gridLength;
        this.keyPosition = keyPosition;
        this.existPosition = existPosition;
        this.blockedNodes = blockedNodes;
        this.agentPostion = {x: 0, y: 0}
        this.isKeyTaken = false;
        this.isExistLocked = true;
    }

    /**
     * Attempts to move the agent in the specified direction.
     *
     * @param direction - The direction in which the agent should move.
     * @returns The agent's position after the move attempt.
     */
    public move(direction: Direction): Position {
        const offsets: Record<Direction, Position> = {
            up: {x: 0, y: -1},
            down: {x: 0, y: 1},
            left: {x: -1, y: 0},
            right: {x: 1, y: 0},
        }
        const offset = offsets[direction]
        const nextPosition = {
            x: this.agentPostion.x + offset.x,
            y: this.agentPostion.y + offset.y,
        }

        const isOutsideGrid =
            nextPosition.x < 0 ||
            nextPosition.x >= this.size ||
            nextPosition.y < 0 ||
            nextPosition.y >= this.size
        const isBlocked = [...this.blockedNodes].some(position =>
            this.positionsMatch(position, nextPosition)
        )

        if (!isOutsideGrid && !isBlocked) {
            this.agentPostion = nextPosition
        }

        return {...this.agentPostion}
    }

    /**
     * Attempts to collect the key at the agent's current position.
     *
     * @returns Whether the key has been collected.
     */
    public takeKey(): boolean {
        if (this.isKeyTaken || !this.positionsMatch(this.agentPostion, this.keyPosition)) {
            return false
        }

        this.isKeyTaken = true
        return true
    }

    /**
     * Attempts to unlock the exit.
     *
     * @returns Whether the exit has been unlocked.
     */
    public unlockExist(): boolean {
        if (
            !this.isExistLocked ||
            !this.isKeyTaken ||
            !this.positionsMatch(this.agentPostion, this.existPosition)
        ) {
            return false
        }

        this.isExistLocked = false
        return true
    }

    /**
     * Gets a snapshot of the current maze state.
     *
     * @returns The key, exit, and agent positions together with the key and
     * exit status.
     */
    public getState(): State {
        return {
            keyPosition: this.keyPosition,
            existPosition: this.existPosition,
            agentPostion: this.agentPostion,
            isKeyTaken: this.isKeyTaken,
            isExistLocked: this.isExistLocked,
        }
    }

    /**
     * Returns information observable at the agent's current node.
     *
     * The method does not accept a position, so nodes elsewhere in the maze
     * cannot be inspected before the agent visits them.
     *
     * @returns A snapshot of the agent's current node.
     */
    public inspectCurrentNode(): NodeInformation {
        return {
            position: {...this.agentPostion},
            hasKey:
                !this.isKeyTaken &&
                this.positionsMatch(this.agentPostion, this.keyPosition),
            hasExit: this.positionsMatch(
                this.agentPostion,
                this.existPosition,
            ),
            isExitLocked: this.isExistLocked,
        }
    }

    /** Determines whether two positions refer to the same maze cell. */
    private positionsMatch(left: Position, right: Position): boolean {
        return left.x === right.x && left.y === right.y
    }
}

export { Enviroment }
