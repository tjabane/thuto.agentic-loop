import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type OpenAI from "openai";

import { OpenAiDecisionClient } from "../../../src/decision-client/openai-decision-client.js";
import { GraphTool } from "../../../src/tools/implementations/graph-tool.js";
import type { Tool } from "../../../src/tools/tool-contracts.js";

const moveTool: Tool = {
    name: "move",
    description: "Move one cell.",
    inputSchema: {
        type: "object",
        properties: { direction: { type: "string", enum: ["up", "down"] } },
        required: ["direction"],
        additionalProperties: false,
    },
    async execute() {
        return { success: true, message: "Moved." };
    },
};
const TEST_SYSTEM_PROMPT = "Use tools to navigate the maze.";

describe("OpenAiDecisionClient", () => {
    test("serializes verified results and translates one function call into an action", async () => {
        let request: unknown;
        const client = new OpenAiDecisionClient({
            model: "test-model",
            client: createClient(
                {
                    output: [
                        {
                            type: "function_call",
                            call_id: "call_123",
                            name: "move",
                            arguments: '{"direction":"right"}',
                        },
                    ],
                },
                value => {
                    request = value;
                },
            ),
        }, TEST_SYSTEM_PROMPT);

        assert.deepEqual(
            await client.decide([{ success: false, message: "Blocked." }], [moveTool]),
            { id: "call_123", name: "move", parameters: { direction: "right" } },
        );
        assert.deepEqual(request, {
            model: "test-model",
            instructions: TEST_SYSTEM_PROMPT,
            input: JSON.stringify({ verifiedToolResults: [{ success: false, message: "Blocked." }] }),
            tools: [
                {
                    type: "function",
                    name: "move",
                    description: "Move one cell.",
                    parameters: moveTool.inputSchema,
                    strict: true,
                },
            ],
            parallel_tool_calls: false,
            tool_choice: "auto",
            store: false,
        });
    });

    test("returns undefined when the provider requests no tool", async () => {
        const client = new OpenAiDecisionClient(
            { client: createClient({ output: [] }) },
            TEST_SYSTEM_PROMPT,
        );

        assert.equal(await client.decide([], [moveTool]), undefined);
    });

    test("serializes array tool properties for the decision provider", async () => {
        let request: unknown;
        const graphTool = new GraphTool();
        const client = new OpenAiDecisionClient(
            {
                client: createClient({ output: [] }, value => {
                    request = value;
                }),
            },
            TEST_SYSTEM_PROMPT,
        );

        await client.decide([], [graphTool]);

        assert.deepEqual((request as { tools: unknown[] }).tools[0], {
            type: "function",
            name: "graph",
            description:
                "Add a node and its adjacent edge nodes, then return the full discovered undirected graph.",
            parameters: {
                type: "object",
                properties: {
                    node: { type: "string" },
                    edges: { type: "array", items: { type: "string" } },
                },
                required: ["node", "edges"],
                additionalProperties: false,
            },
            strict: true,
        });
    });

    test("rejects malformed function-call arguments", async () => {
        const client = new OpenAiDecisionClient({
            client: createClient({
                output: [
                    {
                        type: "function_call",
                        call_id: "call_123",
                        name: "move",
                        arguments: "not json",
                    },
                ],
            }),
        }, TEST_SYSTEM_PROMPT);

        await assert.rejects(client.decide([], [moveTool]), /invalid tool arguments/);
    });
});

function createClient(response: unknown, onRequest?: (request: unknown) => void): Pick<OpenAI, "responses"> {
    return {
        responses: {
            async create(request: unknown): Promise<unknown> {
                onRequest?.(request);
                return response;
            },
        },
    } as Pick<OpenAI, "responses">;
}
