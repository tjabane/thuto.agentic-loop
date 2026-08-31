import type { Position } from "../src/models/position.js";
import { GraphTool } from "../src/tools/implementations/graph-tool.js";
import type { ToolResult } from "../src/tools/tool-contracts.js";
import type { GraphSnapshot, VisualAction } from "./types.js";

function readGraph(graph: GraphTool): GraphSnapshot {
    const snapshot = graph.read();
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
    graph: GraphTool,
): void {
    trace.push({ name, input, result, graph: readGraph(graph) });
}

/** Records the graph tool call used to verify a successful traversal. */
async function appendTraversalGraphUpdate(
    trace: VisualAction[],
    graph: GraphTool,
    from: Position,
    to: Position,
): Promise<void> {
    const input = {
        node: positionKey(from),
        edges: [positionKey(to)],
    };
    const result = await graph.execute(input);
    appendTraceAction(trace, graph.name, input, result, graph);
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
