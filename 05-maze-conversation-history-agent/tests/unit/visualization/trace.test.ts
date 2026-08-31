import { strict as assert } from "node:assert";
import { test } from "bun:test";

import { GraphMap } from "../../../src/map/graph-map.js";
import { UpdateMapTool } from "../../../src/tools/implementations/map-tools/update-map-tool.js";
import { appendTraversalGraphUpdate } from "../../../visualization/trace.js";

test("records automatic traversal graph updates in the visual action stream", async () => {
    const map = new GraphMap();
    const updateMapTool = new UpdateMapTool(map);
    const trace = [];

    await appendTraversalGraphUpdate(
        trace,
        map,
        updateMapTool,
        { x: 0, y: 0 },
        { x: 1, y: 0 },
    );

    assert.deepEqual(trace, [
        {
            name: "update_map",
            input: { node: "0,0", edges: ["1,0"] },
            result: {
                success: true,
                message: "Map updated.",
                data: {
                    nodes: ["0,0", "1,0"],
                    edges: [["0,0", "1,0"]],
                },
            },
            graph: {
                nodes: ["0,0", "1,0"],
                edges: [["0,0", "1,0"]],
            },
        },
    ]);
});
