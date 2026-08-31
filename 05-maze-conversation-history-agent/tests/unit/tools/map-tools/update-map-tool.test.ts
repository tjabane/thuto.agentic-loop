import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { GraphMap } from "../../../../src/map/graph-map.js";
import { UpdateMapTool } from "../../../../src/tools/implementations/map-tools/update-map-tool.js";

describe("UpdateMapTool", () => {
    test("updates the graph-backed map", async () => {
        const tool = new UpdateMapTool(new GraphMap());

        assert.equal(tool.name, "update_map");
        assert.deepEqual(await tool.execute({ node: "start", edges: ["key", "exit"] }), {
            success: true,
            message: "Map updated.",
            data: {
                nodes: ["start", "key", "exit"],
                edges: [["start", "key"], ["start", "exit"]],
            },
        });
    });

    test("rejects invalid updates without changing the map", async () => {
        const tool = new UpdateMapTool(new GraphMap());

        assert.deepEqual(await tool.execute({ node: "", edges: ["exit"] }), {
            success: false,
            message: "Map updates require a non-empty node and an array of non-empty edge nodes.",
        });
    });
});
