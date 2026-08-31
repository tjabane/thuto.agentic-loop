import { strict as assert } from "node:assert";
import { test } from "bun:test";

import { GraphTool } from "../../../src/tools/implementations/graph-tool.js";
import { appendTraversalGraphUpdate } from "../../../visualization/trace.js";

test("records automatic traversal graph updates in the visual action stream", async () => {
    const graph = new GraphTool();
    const trace = [];

    await appendTraversalGraphUpdate(
        trace,
        graph,
        { x: 0, y: 0 },
        { x: 1, y: 0 },
    );

    assert.deepEqual(trace, [
        {
            name: "graph",
            input: { node: "0,0", edges: ["1,0"] },
            result: {
                success: true,
                message: "Graph updated.",
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
