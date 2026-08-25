import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type OpenAI from "openai";

import { Agent } from "../src/agent.js";
import type { ILLMClient, LLMResponse } from "../src/llm/client.js";
import type { Tool } from "../src/tools/tool.js";

type LLMRequest = {
    input: OpenAI.Responses.ResponseInput;
    tools: OpenAI.Responses.FunctionTool[];
};

class FakeLLMClient implements ILLMClient {
    readonly requests: LLMRequest[] = [];

    constructor(private readonly responses: LLMResponse[]) {}

    async getResponse(
        input: OpenAI.Responses.ResponseInput,
        tools: OpenAI.Responses.FunctionTool[],
    ): Promise<LLMResponse> {
        this.requests.push({
            input: structuredClone(input),
            tools: structuredClone(tools),
        });

        const response = this.responses.shift();
        assert.ok(response, "Expected a queued model response");
        return response;
    }
}

function toolCallResponse(
    name: string,
    args: string,
    callId = "call-1",
): LLMResponse {
    return {
        output: [
            {
                type: "function_call",
                name,
                arguments: args,
                call_id: callId,
            },
        ],
        outputText: "",
    };
}

function finalResponse(text: string): LLMResponse {
    return { output: [], outputText: text };
}

function createMoveTool(execute: Tool["execute"]): Tool {
    return {
        name: "move",
        description: "Move through the maze.",
        inputSchema: {
            type: "object",
            properties: {
                direction: { type: "string", enum: ["right"] },
            },
            required: ["direction"],
            additionalProperties: false,
        },
        execute,
    };
}

describe("Agent", () => {
    test("returns a final model response without executing a tool", async () => {
        const client = new FakeLLMClient([finalResponse("Maze complete")]);
        const agent = new Agent("Escape the maze.", [], client);

        assert.equal(await agent.run(), "Maze complete");
        assert.equal(client.requests.length, 1);
        assert.deepEqual(client.requests[0]?.input, [
            { role: "system", content: "Escape the maze." },
        ]);
    });

    test("advertises tools and returns their verified results to the model", async () => {
        const receivedInputs: unknown[] = [];
        const move = createMoveTool(async (input) => {
            receivedInputs.push(input);
            return {
                success: true,
                output: { moved: true, position: { x: 1, y: 0 } },
            };
        });
        const client = new FakeLLMClient([
            toolCallResponse("move", '{"direction":"right"}'),
            finalResponse("Finished"),
        ]);
        const agent = new Agent("Escape the maze.", [move], client);

        assert.equal(await agent.run(), "Finished");
        assert.deepEqual(receivedInputs, [{ direction: "right" }]);
        assert.deepEqual(client.requests[0]?.tools, [
            {
                type: "function",
                name: "move",
                description: "Move through the maze.",
                parameters: move.inputSchema,
                strict: true,
            },
        ]);
        assert.deepEqual(client.requests[1]?.input.at(-1), {
            type: "function_call_output",
            call_id: "call-1",
            output: JSON.stringify({
                success: true,
                output: { moved: true, position: { x: 1, y: 0 } },
            }),
        });
    });

    test("returns an unknown-tool result without executing a tool", async () => {
        let executionCount = 0;
        const move = createMoveTool(() => {
            executionCount += 1;
            return { success: true, output: {} };
        });
        const client = new FakeLLMClient([
            toolCallResponse("teleport", "{}"),
            finalResponse("Recovered"),
        ]);
        const agent = new Agent("Escape the maze.", [move], client);

        assert.equal(await agent.run(), "Recovered");
        assert.equal(executionCount, 0);
        assert.deepEqual(client.requests[1]?.input.at(-1), {
            type: "function_call_output",
            call_id: "call-1",
            output: JSON.stringify({
                success: false,
                error: "Unknown tool: teleport",
            }),
        });
    });

    test("returns malformed arguments as a tool error", async () => {
        let executionCount = 0;
        const move = createMoveTool(() => {
            executionCount += 1;
            return { success: true, output: {} };
        });
        const client = new FakeLLMClient([
            toolCallResponse("move", "not json"),
            finalResponse("Recovered"),
        ]);
        const agent = new Agent("Escape the maze.", [move], client);

        await agent.run();

        assert.equal(executionCount, 0);
        const output = client.requests[1]?.input.at(-1);
        assert.equal(output?.type, "function_call_output");
        assert.match(String(output.output), /Unexpected token|JSON/);
    });

    test("rejects invalid turn limits before requesting the model", async () => {
        const client = new FakeLLMClient([]);
        const agent = new Agent("Escape the maze.", [], client);

        await assert.rejects(agent.run(0), RangeError);
        assert.equal(client.requests.length, 0);
    });

    test("stops after the maximum number of model turns", async () => {
        const move = createMoveTool(() => ({
            success: true,
            output: { moved: true },
        }));
        const client = new FakeLLMClient([
            toolCallResponse("move", '{"direction":"right"}'),
        ]);
        const agent = new Agent("Escape the maze.", [move], client);

        await assert.rejects(agent.run(1), /Maximum number of turns reached/);
        assert.equal(client.requests.length, 1);
    });
});
