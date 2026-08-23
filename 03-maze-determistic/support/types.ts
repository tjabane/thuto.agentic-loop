/** Zero-based coordinates of a cell in the maze. */
type Position = {
    /** Horizontal coordinate, increasing from left to right. */
    readonly x: number;
    /** Vertical coordinate, increasing from top to bottom. */
    readonly y: number;
};

/** Snapshot of the maze cell currently occupied by the agent. */
type Observation = {
    /** Coordinates of the observed cell. */
    position: Position;
    /** Whether the observed cell blocks movement. */
    isBlocked: boolean;
    /** Whether an uncollected key is present. */
    hasKey: boolean;
    /** Whether the cell is the maze exit. */
    isExit: boolean;
    /** Whether the exit on this cell has been unlocked. */
    isUnlocked: boolean;
};

/** A recorded movement attempt made from a maze position. */
type MoveHistory = {
    /** Position occupied before the movement attempt. */
    position: Position;
    /** Direction in which movement was attempted. */
    direction: Direction;
};

/** An operation that the agent can request from the environment. */
type Action = {
    /** Kind of operation to perform. */
    type: "move" | "takeKey" | "unlockExit" | "exit";
    /** Movement direction; required when {@link type} is `move`. */
    direction?: Direction;
};

/** One of the four orthogonal movement directions. */
type Direction = "up" | "down" | "left" | "right";

/** High-level stage of the agent's search strategy. */
type AgentPhase = "explore" | "exploit" | "finished";

/** Outcome that caused the agent loop to stop. */
type TerminationReason = "success" | "unreachable" | "safety_limit";

/** The agent's accumulated knowledge about one traversable maze cell. */
type TraversalNode = {
    /** Coordinates represented by this node. */
    readonly position: Position;
    /** Known traversable neighbours indexed by the direction to them. */
    readonly neighbours: Partial<Record<Direction, Position>>;
    /** Directions already attempted from this cell. */
    readonly attemptedDirections: Set<Direction>;
    /** Attempted directions found to contain a wall or maze boundary. */
    readonly blockedDirections: Set<Direction>;
    /** Whether this cell has been observed to be the exit. */
    isExit: boolean;
};

export type {
    Position,
    Direction,
    Observation,
    Action,
    MoveHistory,
    AgentPhase,
    TerminationReason,
    TraversalNode,
};
