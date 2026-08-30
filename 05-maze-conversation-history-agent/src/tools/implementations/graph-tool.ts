import { isValidToolInput } from "../schemas.js";
import type { Tool, ToolInputValue, ToolResult } from "../tool-contracts.js";

const GRAPH_TOOL_INPUT_SCHEMA = {
    type: "object",
    properties: {
        node: { type: "string" },
        edges: { type: "array", items: { type: "string" } },
    },
    required: ["node", "edges"],
    additionalProperties: false,
} as const;

/** Provides read-only access to the accumulated graph. */
interface GraphReader {
    read(): Readonly<Record<string, unknown>>;
}

/** Accumulates the agent's discovered undirected graph. */
class GraphTool implements Tool, GraphReader {
    public readonly name = "graph";
    public readonly description =
        "Add a node and its adjacent edge nodes, then return the full discovered undirected graph.";
    public readonly inputSchema = GRAPH_TOOL_INPUT_SCHEMA;
    private readonly adjacentNodes = new Map<string, Set<string>>();

    public async execute(input: unknown): Promise<ToolResult> {
        if (!isValidToolInput(input, this.inputSchema) || !isGraphInput(input)) {
            return invalidGraphRequest();
        }

        this.addNode(input.node);
        for (const edgeNode of input.edges) {
            this.addEdge(input.node, edgeNode);
        }

        return { success: true, message: "Graph updated.", data: this.read() };
    }

    /** Returns the current graph without changing it. */
    public read(): Readonly<Record<string, unknown>> {
        return this.fullGraph();
    }

    private addNode(node: string): void {
        if (!this.adjacentNodes.has(node)) {
            this.adjacentNodes.set(node, new Set());
        }
    }

    private addEdge(from: string, to: string): void {
        this.addNode(to);
        this.adjacentNodes.get(from)?.add(to);
        this.adjacentNodes.get(to)?.add(from);
    }

    private fullGraph(): Readonly<Record<string, unknown>> {
        const nodes = [...this.adjacentNodes.keys()];
        const nodeIndexes = new Map(nodes.map((node, index) => [node, index]));
        const edges: Array<readonly [string, string]> = [];

        for (const [from, neighbours] of this.adjacentNodes) {
            for (const to of neighbours) {
                if ((nodeIndexes.get(from) ?? -1) < (nodeIndexes.get(to) ?? -1)) {
                    edges.push([from, to]);
                }
            }
        }

        return { nodes, edges };
    }
}

function isGraphInput(
    input: Readonly<Record<string, ToolInputValue>>,
): input is Readonly<{ node: string; edges: readonly string[] }> {
    return (
        typeof input.node === "string" &&
        input.node.trim().length > 0 &&
        Array.isArray(input.edges) &&
        input.edges.length > 0 &&
        input.edges.every(edge => typeof edge === "string" && edge.trim().length > 0)
    );
}

function invalidGraphRequest(): ToolResult {
    return {
        success: false,
        message: "Graph requires a non-empty node and an array of non-empty edge nodes.",
    };
}

export { type GraphReader, GraphTool };
