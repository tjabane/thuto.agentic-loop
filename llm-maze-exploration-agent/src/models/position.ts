
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

/** Information observable at the agent's current maze node. */
type NodeInformation = {
    /** The coordinates of the node being observed. */
    position: Position;

    /** Whether an uncollected key is present at this node. */
    hasKey: boolean;

    /** Whether the maze exit is present at this node. */
    hasExit: boolean;

    /** Whether the maze exit is currently locked. */
    isExitLocked: boolean;
}

export type {Position, Direction, NodeInformation, State}
