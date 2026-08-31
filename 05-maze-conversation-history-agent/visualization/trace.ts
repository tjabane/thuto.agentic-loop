import type { Position } from "../src/models/position.js";
import type { MazeMap } from "../src/map/map-contracts.js";
import { UpdateMapTool } from "../src/tools/implementations/map-tools/update-map-tool.js";
import type { ToolResult } from "../src/tools/tool-contracts.js";
import type { GraphSnapshot, VisualAction } from "./types.js";

function readGraph(map: MazeMap): GraphSnapshot {
    const snapshot = map.readMap();
    if (!isGraphSnapshot(snapshot)) {
        throw new Error("Graph tool returned an invalid graph snapshot.");
    }
    return snapshot;
}

function appendTraceAction(
    trace: VisualAction[],
    name: string,
    input: unknown,
    result: ToolResult,
    map: MazeMap,
): void {
    trace.push({ name, input, result, graph: readGraph(map) });
}

/** Records the map tool call used to verify a successful traversal. */
async function appendTraversalGraphUpdate(
    trace: VisualAction[],
    map: MazeMap,
    updateMapTool: UpdateMapTool,
    from: Position,
    to: Position,
): Promise<void> {
    const input = {
        node: positionKey(from),
        edges: [positionKey(to)],
    };
    const result = await updateMapTool.execute(input);
    appendTraceAction(trace, updateMapTool.name, input, result, map);
}

function positionKey(position: Position): string {
    return `${position.x},${position.y}`;
}

function isGraphSnapshot(value: unknown): value is GraphSnapshot {
    if (typeof value !== "object" || value === null) return false;
    const candidate = value as Record<string, unknown>;
    return Array.isArray(candidate.nodes) && Array.isArray(candidate.edges);
}

export { appendTraceAction, appendTraversalGraphUpdate };
