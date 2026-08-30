import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { GraphTool } from "../../../src/tools/implementations/graph-tool.js";

describe("GraphTool", () => {
    test("adds a node and its edges, then returns the full graph", async () => {
        const tool = new GraphTool();

        assert.equal(tool.name, "graph");
        assert.deepEqual(
            await tool.execute({ node: "start", edges: ["key", "exit"] }),
            {
                success: true,
                message: "Graph updated.",
                data: {
                    nodes: ["start", "key", "exit"],
                    edges: [
                        ["start", "key"],
                        ["start", "exit"],
                    ],
                },
            },
        );
    });

    test("merges later updates and does not duplicate undirected edges", async () => {
        const tool = new GraphTool();

        await tool.execute({ node: "start", edges: ["key"] });
        assert.deepEqual(
            await tool.execute({
                node: "key",
                edges: ["start", "exit"],
            }),
            {
                success: true,
                message: "Graph updated.",
                data: {
                    nodes: ["start", "key", "exit"],
                    edges: [
                        ["start", "key"],
                        ["key", "exit"],
                    ],
                },
            },
        );
    });

    test("rejects malformed node and edge input without changing the graph", async () => {
        const tool = new GraphTool();
        await tool.execute({ node: "start", edges: ["key"] });

        assert.deepEqual(
            await tool.execute({ node: "", edges: ["exit"] }),
            {
                success: false,
                message: "Graph requires a non-empty node and an array of non-empty edge nodes.",
            },
        );
        assert.deepEqual(
            await tool.execute({
                node: "start",
                edges: "key",
            }),
            {
                success: false,
                message: "Graph requires a non-empty node and an array of non-empty edge nodes.",
            },
        );
        assert.deepEqual(await tool.execute({ node: "start", edges: [] }), {
            success: false,
            message: "Graph requires a non-empty node and an array of non-empty edge nodes.",
        });
        assert.deepEqual(await tool.execute({ node: "key", edges: ["exit"] }), {
            success: true,
            message: "Graph updated.",
            data: {
                nodes: ["start", "key", "exit"],
                edges: [
                    ["start", "key"],
                    ["key", "exit"],
                ],
            },
        });
    });
});
