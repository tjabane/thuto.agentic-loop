import type { Direction, Observation, Position } from "./support/types.js";

/**
 * Mutable grid-world environment in which an agent finds a key and unlocks an exit.
 *
 * The environment owns authoritative maze and interaction state. Positions passed
 * into or returned from its public API are copied so callers cannot mutate that state.
 */
class Environment {
    private readonly maze: number[][];
    private agentPosition: Position;
    private readonly keyPosition: Position;
    private readonly exitPosition: Position;
    private isKeyCollected = false;
    private isExitLocked = true;

    /**
     * Creates a rectangular maze environment.
     *
     * @param numberOfRows - Positive integer height of the maze.
     * @param numberOfColumns - Positive integer width of the maze.
     * @param blockedCells - In-bounds cells through which the agent cannot move.
     * @param keyPosition - In-bounds, traversable location of the key.
     * @param exitPosition - In-bounds, traversable location of the exit.
     * @param agentPosition - Initial in-bounds, traversable agent location.
     * @throws {@link RangeError} When dimensions or positions are invalid.
     * @throws {@link Error} When the agent, key, or exit is on a blocked cell.
     */
    constructor(
        numberOfRows: number,
        numberOfColumns: number,
        blockedCells: Position[],
        keyPosition: Position,
        exitPosition: Position,
        agentPosition: Position = { x: 0, y: 0 },
    ) {
        this.validateDimensions(numberOfRows, numberOfColumns);
        this.validatePosition(agentPosition, numberOfRows, numberOfColumns, "Agent");
        this.validatePosition(keyPosition, numberOfRows, numberOfColumns, "Key");
        this.validatePosition(exitPosition, numberOfRows, numberOfColumns, "Exit");
        for (const blockedCell of blockedCells) {
            this.validatePosition(blockedCell, numberOfRows, numberOfColumns, "Blocked cell");
        }

        const blockedKeys = new Set(blockedCells.map(cell => this.makePositionKey(cell)));
        this.assertNotBlocked(agentPosition, blockedKeys, "Agent");
        this.assertNotBlocked(keyPosition, blockedKeys, "Key");
        this.assertNotBlocked(exitPosition, blockedKeys, "Exit");

        this.maze = Array.from({ length: numberOfRows }, () =>
            Array<number>(numberOfColumns).fill(0),
        );
        for (const cell of blockedCells) {
            const row = this.maze[cell.y];
            if (row) {
                row[cell.x] = 1;
            }
        }

        this.agentPosition = { ...agentPosition };
        this.keyPosition = { ...keyPosition };
        this.exitPosition = { ...exitPosition };
    }

    /** @returns A copy of the agent's current position. */
    public getAgentPosition(): Position {
        return { ...this.agentPosition };
    }

    /**
     * Attempts to move the agent one cell in a cardinal direction.
     *
     * @param direction - Direction in which to move.
     * @returns The new position, or the sentinel `{-1, -1}` when movement is blocked
     * or would leave the maze.
     */
    public changeAgentPosition(direction: Direction): Position {
        const candidate = this.getNeighbour(this.agentPosition, direction);
        if (!this.isTraversable(candidate)) {
            return { x: -1, y: -1 };
        }

        this.agentPosition = candidate;
        return { ...this.agentPosition };
    }

    /**
     * Collects the key when the agent currently occupies its cell.
     *
     * @returns `true` only when this call collected the key.
     */
    public collectKey(): boolean {
        if (this.isKeyCollected || !this.positionsMatch(this.agentPosition, this.keyPosition)) {
            return false;
        }
        this.isKeyCollected = true;
        return true;
    }

    /**
     * Unlocks the exit when the agent is at the exit and has collected the key.
     *
     * @returns `true` only when this call unlocked the exit.
     */
    public unlockExit(): boolean {
        if (
            !this.isExitLocked ||
            !this.isKeyCollected ||
            !this.positionsMatch(this.agentPosition, this.exitPosition)
        ) {
            return false;
        }
        this.isExitLocked = false;
        return true;
    }

    /** @returns Whether the agent currently occupies an unlocked exit. */
    public agentExited(): boolean {
        return (
            this.positionsMatch(this.agentPosition, this.exitPosition) && !this.isExitLocked
        );
    }

    /** @returns A snapshot describing the cell currently occupied by the agent. */
    public viewCurrentCell(): Observation {
        return {
            position: { ...this.agentPosition },
            isBlocked: false,
            hasKey:
                this.positionsMatch(this.agentPosition, this.keyPosition) && !this.isKeyCollected,
            isExit: this.positionsMatch(this.agentPosition, this.exitPosition),
            isUnlocked:
                this.positionsMatch(this.agentPosition, this.exitPosition) && !this.isExitLocked,
        };
    }

    private validateDimensions(numberOfRows: number, numberOfColumns: number): void {
        if (
            !Number.isInteger(numberOfRows) ||
            !Number.isInteger(numberOfColumns) ||
            numberOfRows <= 0 ||
            numberOfColumns <= 0
        ) {
            throw new RangeError("Maze dimensions must be positive integers");
        }
    }

    private validatePosition(
        position: Position,
        numberOfRows: number,
        numberOfColumns: number,
        label: string,
    ): void {
        if (
            !Number.isInteger(position.x) ||
            !Number.isInteger(position.y) ||
            position.x < 0 ||
            position.x >= numberOfColumns ||
            position.y < 0 ||
            position.y >= numberOfRows
        ) {
            throw new RangeError(`${label} position is outside the maze`);
        }
    }

    private assertNotBlocked(
        position: Position,
        blockedKeys: ReadonlySet<string>,
        label: string,
    ): void {
        if (blockedKeys.has(this.makePositionKey(position))) {
            throw new Error(`${label} position cannot be blocked`);
        }
    }

    private getNeighbour(position: Position, direction: Direction): Position {
        const offsets: Record<Direction, Position> = {
            up: { x: 0, y: -1 },
            down: { x: 0, y: 1 },
            left: { x: -1, y: 0 },
            right: { x: 1, y: 0 },
        };
        const offset = offsets[direction];
        return { x: position.x + offset.x, y: position.y + offset.y };
    }

    private isTraversable(position: Position): boolean {
        const row = this.maze[position.y];
        return row !== undefined && row[position.x] === 0;
    }

    private positionsMatch(left: Position, right: Position): boolean {
        return left.x === right.x && left.y === right.y;
    }

    private makePositionKey(position: Position): string {
        return `${position.x},${position.y}`;
    }
}

export { Environment };
