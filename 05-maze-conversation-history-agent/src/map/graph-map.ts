import type { MapSnapshot, MazeMap } from "./map-contracts.js";

/** An undirected graph implementation of the agent's discovered maze map. */
class GraphMap implements MazeMap {
    private readonly adjacentNodes = new Map<string, Set<string>>();

    public updateMap(node: string, edges: readonly string[]): void {
        this.addNode(node);
        for (const edgeNode of edges) this.addEdge(node, edgeNode);
    }

    public readMap(): MapSnapshot {
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

    private addNode(node: string): void {
        if (!this.adjacentNodes.has(node)) this.adjacentNodes.set(node, new Set());
    }

    private addEdge(from: string, to: string): void {
        this.addNode(to);
        this.adjacentNodes.get(from)?.add(to);
        this.adjacentNodes.get(to)?.add(from);
    }
}

export { GraphMap };
