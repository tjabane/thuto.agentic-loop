type Position = {
    readonly x: number;
    readonly y: number;
};

type Observation = {
    position: Position;
    isBlocked: boolean;
    hasKey: boolean;
    isExit: boolean;
    isUnlocked: boolean;
};

type MoveHistory = {
    position: Position;
    direction: Direction;
};

type Action = {
    type: "move" | "takeKey" | "unlockExit" | "exit";
    direction?: Direction;
};

type Direction = "up" | "down" | "left" | "right";

type AgentPhase = "explore" | "exploit" | "finished";

type TerminationReason = "success" | "unreachable" | "safety_limit";

type TraversalNode = {
    readonly position: Position;
    readonly neighbours: Partial<Record<Direction, Position>>;
    readonly attemptedDirections: Set<Direction>;
    readonly blockedDirections: Set<Direction>;
    isExit: boolean;
};

export {
    Position,
    Direction,
    Observation,
    Action,
    MoveHistory,
    AgentPhase,
    TerminationReason,
    TraversalNode,
};
