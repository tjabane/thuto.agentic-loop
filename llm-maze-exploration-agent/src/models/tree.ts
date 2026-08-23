import type { Edge, VertexId } from "./graph.js";

/** A tree represented by its vertices and undirected edges. */
class Tree {
    /** Every vertex contained in the tree. */
    readonly vertices: VertexId[] = [];

    /** Connections between vertices in the tree. */
    readonly edges: Edge[] = [];

    /**
     * Adds a vertex if it is not already present.
     *
     * @param vertex - The vertex to add.
     */
    addVertex(vertex: VertexId): void {
        if (!this.vertices.includes(vertex)) {
            this.vertices.push(vertex);
        }
    }

    /**
     * Adds an undirected edge if it is not already present.
     *
     * @param from - One endpoint of the edge.
     * @param to - The other endpoint of the edge.
     */
    addEdge(from: VertexId, to: VertexId): void {
        const edgeExists = this.edges.some(
            ([left, right]) =>
                (left === from && right === to) ||
                (left === to && right === from),
        );

        if (!edgeExists) {
            this.edges.push([from, to]);
        }
    }

    /**
     * Records both vertices and the edge traversed between them.
     *
     * @param from - The vertex occupied before traversal.
     * @param to - The vertex reached after traversal.
     */
    addTraversal(from: VertexId, to: VertexId): void {
        this.addVertex(from);
        this.addVertex(to);
        this.addEdge(from, to);
    }
}

export { Tree };
