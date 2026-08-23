import type { Position } from "../../04-maze-llm-agent/src/models/position.js";

type VisualDirection = "north" | "east" | "south" | "west";

type VisualEvent =
    | { type: "inspect"; position: Position }
    | { type: "move"; direction: VisualDirection; succeeded: boolean }
    | { type: "takeKey"; succeeded: boolean }
    | { type: "unlockExit"; succeeded: boolean }
    | { type: "exit"; succeeded: boolean };

type MazeConfiguration = {
    rows: number;
    columns: number;
    blockedCells: Position[];
    start: Position;
    key: Position;
    exit: Position;
};

type MazeRunResponse = {
    trace: VisualEvent[];
    finalPosition: Position;
    terminationReason: "success" | "action_limit";
    actionCount: number;
};

export type {
    MazeConfiguration,
    MazeRunResponse,
    VisualDirection,
    VisualEvent,
};
