type MapSnapshot = Readonly<{
    nodes: readonly string[];
    edges: readonly (readonly [string, string])[];
}>;

/** Stores the agent's discovered maze map independently of any tool protocol. */
interface MazeMap {
    updateMap(node: string, edges: readonly string[]): void;
    readMap(): MapSnapshot;
}

export type { MapSnapshot, MazeMap };
