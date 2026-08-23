import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { Agent } from "../src/agent.js";
import { Enviroment } from "../src/enviroment.js";
import type { ActionPlanner } from "../src/llm/planner.js";
import type { Action, AgentState } from "../src/models/agent-utils.js";

class FakePlanner implements ActionPlanner {
    state: AgentState | undefined;

    constructor(private readonly action: Action) {}

    async plan(state: AgentState): Promise<Action> {
        this.state = state;
        return this.action;
    }
}

describe("Agent planning", () => {
    test("delegates planning with a snapshot of known state", async () => {
        const planner = new FakePlanner({ type: "move", direction: "right" });
        const agent = new Agent(planner);
        agent.pathTree.addVertex("0,0");
        agent.blockedNodes.add("0,1");
        agent.isKeyCollected = true;
        const enviroment = new Enviroment(
            2,
            { x: 1, y: 1 },
            { x: 1, y: 1 },
            new Set(),
        );

        await agent.run(enviroment, 1);

        assert.deepEqual(planner.state, {
            position: "0,0",
            currentNode: {
                position: { x: 0, y: 0 },
                hasKey: false,
                hasExit: false,
                isExitLocked: true,
            },
            pathTree: planner.state?.pathTree,
            blockedNodes: ["0,1"],
            isKeyCollected: true,
            isExistUnlocked: false,
        });
        assert.deepEqual(planner.state?.pathTree.vertices, ["0,0"]);
        assert.deepEqual(planner.state?.pathTree.edges, []);
    });

    test("does not expose mutable agent collections to the planner", async () => {
        const planner = new FakePlanner({ type: "takeKey" });
        const agent = new Agent(planner);
        agent.pathTree.addVertex("0,0");
        const enviroment = new Enviroment(
            1,
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            new Set(),
        );

        await agent.run(enviroment, 1);
        planner.state?.blockedNodes.push("1,0");
        planner.state?.pathTree.addVertex("2,2");

        assert.deepEqual([...agent.blockedNodes], []);
        assert.deepEqual(agent.pathTree.vertices, ["0,0"]);
    });
});

describe("Agent run", () => {
    test("collects the key, unlocks the exit, and exits", async () => {
        const actions: Action[] = [
            { type: "takeKey" },
            { type: "unlockExist" },
            { type: "exit" },
        ];
        const planner: ActionPlanner = {
            async plan() {
                const action = actions.shift();
                assert.ok(action);
                return action;
            },
        };
        const agent = new Agent(planner);
        const enviroment = new Enviroment(
            1,
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            new Set(),
        );

        const result = await agent.run(enviroment);

        assert.equal(result.terminationReason, "success");
        assert.equal(result.actionCount, 3);
        assert.equal(result.finalState.isKeyCollected, true);
        assert.equal(result.finalState.isExistUnlocked, true);
    });

    test("stops before executing more than the action limit", async () => {
        const planner: ActionPlanner = {
            async plan() {
                return { type: "move", direction: "up" };
            },
        };
        const agent = new Agent(planner);
        const enviroment = new Enviroment(
            2,
            { x: 1, y: 1 },
            { x: 1, y: 1 },
            new Set(),
        );

        const result = await agent.run(enviroment, 2);

        assert.equal(result.terminationReason, "action_limit");
        assert.equal(result.actionCount, 2);
    });

    test("rejects an invalid action limit", async () => {
        const planner: ActionPlanner = {
            async plan() {
                return { type: "exit" };
            },
        };
        const agent = new Agent(planner);
        const enviroment = new Enviroment(
            1,
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            new Set(),
        );

        await assert.rejects(
            () => agent.run(enviroment, 0),
            new RangeError("maxActions must be a positive integer."),
        );
    });
});
