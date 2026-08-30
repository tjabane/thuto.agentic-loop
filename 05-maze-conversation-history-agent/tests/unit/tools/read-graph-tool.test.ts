import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { GraphTool } from "../../../src/tools/implementations/graph-tool.js";
import { ReadGraphTool } from "../../../src/tools/implementations/read-graph-tool.js";

describe("ReadGraphTool", () => {
    test("returns the graph accumulated by the graph tool without changing it", async () => {
        const graphTool = new GraphTool();
        const tool = new ReadGraphTool(graphTool);
        await graphTool.execute({ node: "start", edges: ["key", "exit"] });

        assert.equal(tool.name, "read_graph");
        assert.deepEqual(await tool.execute({}), {
            success: true,
            message: "Current graph retrieved.",
            data: {
                nodes: ["start", "key", "exit"],
                edges: [
                    ["start", "key"],
                    ["start", "exit"],
                ],
            },
        });
        assert.deepEqual(await tool.execute({}), {
            success: true,
            message: "Current graph retrieved.",
            data: {
                nodes: ["start", "key", "exit"],
                edges: [
                    ["start", "key"],
                    ["start", "exit"],
                ],
            },
        });
    });

    test("rejects input because graph reads are argument-free", async () => {
        const tool = new ReadGraphTool(new GraphTool());

        assert.deepEqual(await tool.execute({ node: "start" }), {
            success: false,
            message: "Reading the graph does not accept arguments.",
        });
    });
});
