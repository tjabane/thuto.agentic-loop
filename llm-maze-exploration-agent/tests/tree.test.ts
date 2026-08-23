import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { Tree } from "../src/models/tree.js";

describe("Tree", () => {
    test("adds each vertex only once", () => {
        const tree = new Tree();

        tree.addVertex("0,0");
        tree.addVertex("0,0");

        assert.deepEqual(tree.vertices, ["0,0"]);
    });

    test("treats an edge as undirected and adds it only once", () => {
        const tree = new Tree();

        tree.addEdge("0,0", "1,0");
        tree.addEdge("1,0", "0,0");

        assert.deepEqual(tree.edges, [["0,0", "1,0"]]);
    });

    test("records both vertices and their traversal edge", () => {
        const tree = new Tree();

        tree.addTraversal("0,0", "1,0");

        assert.deepEqual(tree.vertices, ["0,0", "1,0"]);
        assert.deepEqual(tree.edges, [["0,0", "1,0"]]);
    });
});
