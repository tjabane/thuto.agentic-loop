import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { GraphMap } from "../../../src/map/graph-map.js";

describe("GraphMap", () => {
    test("merges map updates and does not duplicate undirected edges", () => {
        const map = new GraphMap();

        map.updateMap("start", ["key"]);
        map.updateMap("key", ["start", "exit"]);

        assert.deepEqual(map.readMap(), {
            nodes: ["start", "key", "exit"],
            edges: [["start", "key"], ["key", "exit"]],
        });
    });
});
