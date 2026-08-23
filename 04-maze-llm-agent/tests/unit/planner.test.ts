import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { ILLMClient } from "../../src/llm/client.js";
import { LlmActionPlanner } from "../../src/llm/planner.js";
import type { Action, AgentState } from "../../src/models/agent-utils.js";
import { Tree } from "../../src/models/tree.js";

class FakeClient implements ILLMClient {
    prompt: string | undefined;

    constructor(private readonly action: Action) {}

    async getNextAction(prompt: string): Promise<Action> {
        this.prompt = prompt;
        return this.action;
    }
}

function createState(): AgentState {
    const pathTree = new Tree();
    pathTree.addTraversal("0,0", "1,0");

    return {
        position: "1,0",
        currentNode: {
            position: { x: 1, y: 0 },
            hasKey: false,
            hasExit: false,
            isExitLocked: true,
        },
        pathTree,
        blockedNodes: ["1,1"],
        isKeyCollected: false,
        existLocation: "2,0",
        isExistUnlocked: false,
    };
}

describe("LlmActionPlanner", () => {
    test("returns the action selected by the client", async () => {
        const client = new FakeClient({ type: "move", direction: "right" });
        const planner = new LlmActionPlanner(client);

        assert.deepEqual(await planner.plan(createState()), {
            type: "move",
            direction: "right",
        });
    });

    test("presents only known state and supported actions", async () => {
        const client = new FakeClient({ type: "takeKey" });
        const planner = new LlmActionPlanner(client);

        await planner.plan(createState());

        assert.ok(client.prompt);
        assert.match(client.prompt, /"position": "1,0"/);
        assert.match(client.prompt, /"currentNode": \{/);
        assert.match(client.prompt, /"blockedNodes": \[/);
        assert.match(client.prompt, /"1,1"/);
        assert.match(client.prompt, /"knownExitLocation": "2,0"/);
        assert.match(client.prompt, /"direction": "up"/);
        assert.match(client.prompt, /"type": "unlockExist"/);
        assert.doesNotMatch(client.prompt, /keyPosition|existPosition/);
    });

    test("represents an undiscovered exit as null", async () => {
        const client = new FakeClient({ type: "move", direction: "down" });
        const planner = new LlmActionPlanner(client);
        const state = createState();
        delete state.existLocation;

        await planner.plan(state);

        assert.ok(client.prompt);
        assert.match(client.prompt, /"knownExitLocation": null/);
    });
});
