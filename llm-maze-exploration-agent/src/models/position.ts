
type Direction = "up"| "down"| "left" | "right"

type Position = {
    x: number
    y: number
}

type State = {
    keyPosition: Position;
    existPosition: Position;
    agentPostion: Position;
    isKeyTaken: boolean;
    isExistLocked: boolean;
}

export type {Position, Direction, State}
