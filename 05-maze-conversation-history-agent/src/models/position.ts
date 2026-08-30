/** Supported orthogonal movement directions. */
const DIRECTIONS = ["up", "down", "left", "right"] as const;

/** A supported orthogonal movement direction. */
type Direction = (typeof DIRECTIONS)[number];

type Position = {
    x: number;
    y: number;
};

type State = {
    keyPosition: Position;
    existPosition: Position;
    agentPostion: Position;
    isKeyTaken: boolean;
    isExistLocked: boolean;
};

/** Information observable at the agent's current maze node. */
type NodeInformation = {
    position: Position;
    hasKey: boolean;
    hasExit: boolean;
    isExitLocked: boolean;
};

export {
    DIRECTIONS,
    type Direction,
    type NodeInformation,
    type Position,
    type State,
};
