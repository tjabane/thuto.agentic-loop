import type { Position } from "../src/models/position.js";
import type { ToolResult } from "../src/tools/tool-contracts.js";

type GraphSnapshot = {
    readonly nodes: readonly string[];
    readonly edges: readonly (readonly [string, string])[];
};

type VisualAction = {
    readonly name: string;
    readonly input: unknown;
    readonly result: ToolResult;
    readonly graph: GraphSnapshot;
};

type MazeConfiguration = {
    readonly rows: 3;
    readonly columns: 3;
    readonly blockedCells: readonly Position[];
    readonly start: Position;
    readonly key: Position;
    readonly exit: Position;
};

type MazeRunResponse = {
    readonly trace: readonly VisualAction[];
    readonly finalPosition: Position;
    readonly terminationReason: "success" | "action_limit" | "incomplete";
    readonly actionCount: number;
};

export type { GraphSnapshot, MazeConfiguration, MazeRunResponse, VisualAction };
