import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type OpenAI from "openai";

import { LLMClient } from "../src/llm/client.js";

function fakeOpenAI(outputText: string): Pick<OpenAI, "responses"> {
    return {
        responses: {
            create: async () => ({ output_text: outputText }),
        },
    } as unknown as Pick<OpenAI, "responses">;
}

describe("LLMClient", () => {
    test("returns a validated move action", async () => {
        const client = new LLMClient({
            client: fakeOpenAI('{"type":"move","direction":"right"}'),
            model: "test-model",
        });

        assert.deepEqual(await client.getNextAction("Choose an action."), {
            type: "move",
            direction: "right",
        });
    });

    test("returns a validated action without a direction", async () => {
        const client = new LLMClient({
            client: fakeOpenAI('{"type":"takeKey","direction":null}'),
        });

        assert.deepEqual(await client.getNextAction("Choose an action."), {
            type: "takeKey",
        });
    });

    test("rejects an empty prompt before calling the API", async () => {
        const client = new LLMClient({ client: fakeOpenAI("") });

        await assert.rejects(
            () => client.getNextAction("   "),
            new TypeError("The planning prompt cannot be empty."),
        );
    });

    test("rejects invalid JSON", async () => {
        const client = new LLMClient({ client: fakeOpenAI("not-json") });

        await assert.rejects(
            () => client.getNextAction("Choose an action."),
            new Error("The model returned invalid action JSON."),
        );
    });

    test("requires a direction for movement", async () => {
        const client = new LLMClient({
            client: fakeOpenAI('{"type":"move","direction":null}'),
        });

        await assert.rejects(
            () => client.getNextAction("Choose an action."),
            new Error("A move action requires a direction."),
        );
    });

    test("rejects a direction on non-movement actions", async () => {
        const client = new LLMClient({
            client: fakeOpenAI('{"type":"exit","direction":"up"}'),
        });

        await assert.rejects(
            () => client.getNextAction("Choose an action."),
            new Error("Only move actions may include a direction."),
        );
    });
});
