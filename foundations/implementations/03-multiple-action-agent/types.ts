type Position = {
    readonly x: number;
    readonly y: number;
};

type Observation = {
    currentPosition: Position;
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

export { Position, Direction, Observation, Action, MoveHistory };