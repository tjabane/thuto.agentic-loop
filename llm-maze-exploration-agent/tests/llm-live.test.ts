import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { Agent } from "../src/agent.js";
import { Enviroment } from "../src/enviroment.js";
import { LLMClient } from "../src/llm/client.js";
import { LlmActionPlanner } from "../src/llm/planner.js";
import { vertexId } from "../src/models/graph.js";
import type { Position } from "../src/models/position.js";

const LIVE_TESTS_ENABLED = process.env.RUN_LIVE_LLM_TESTS === "true";
const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.6-luna";
const MAX_ACTIONS = Number(process.env.LLM_E2E_MAX_ACTIONS ?? 25);
const LIVE_TEST_TIMEOUT_MS = 5 * 60 * 1000;

interface MazeScenario {
    name: string;
    size: number;
    keyPosition: Position;
    exitPosition: Position;
    blockedNodes: Position[];
    expectedTermination: "success" | "action_limit";
}

const scenarios: MazeScenario[] = [
    {
        name: "key and exit share the starting node",
        size: 1,
        keyPosition: { x: 0, y: 0 },
        exitPosition: { x: 0, y: 0 },
        blockedNodes: [],
        expectedTermination: "success",
    },
    {
        name: "key is encountered before the exit",
        size: 3,
        keyPosition: { x: 1, y: 0 },
        exitPosition: { x: 2, y: 0 },
        blockedNodes: [],
        expectedTermination: "success",
    },
    {
        name: "exit is discovered before the key and must be revisited",
        size: 3,
        keyPosition: { x: 0, y: 1 },
        exitPosition: { x: 1, y: 0 },
        blockedNodes: [{ x: 1, y: 1 }],
        expectedTermination: "success",
    },
    {
        name: "direct route is blocked but an alternate route exists",
        size: 3,
        keyPosition: { x: 2, y: 0 },
        exitPosition: { x: 2, y: 2 },
        blockedNodes: [{ x: 1, y: 0 }],
        expectedTermination: "success",
    },
    {
        name: "key is unreachable",
        size: 3,
        keyPosition: { x: 2, y: 2 },
        exitPosition: { x: 0, y: 2 },
        blockedNodes: [
            { x: 1, y: 2 },
            { x: 2, y: 1 },
        ],
        expectedTermination: "action_limit",
    },
    {
        name: "exit is unreachable after collecting the starting key",
        size: 3,
        keyPosition: { x: 0, y: 0 },
        exitPosition: { x: 2, y: 2 },
        blockedNodes: [
            { x: 1, y: 2 },
            { x: 2, y: 1 },
        ],
        expectedTermination: "action_limit",
    },
];

describe("LLM maze exploration scenarios", { concurrency: false }, () => {
    for (const scenario of scenarios) {
        test(scenario.name, {
            skip: !LIVE_TESTS_ENABLED,
            timeout: LIVE_TEST_TIMEOUT_MS,
        }, async () => {
            const client = new LLMClient({ model: MODEL });
            const planner = new LlmActionPlanner(client);
            const agent = new Agent(planner);
            const enviroment = new Enviroment(
                scenario.size,
                scenario.keyPosition,
                scenario.exitPosition,
                new Set(scenario.blockedNodes),
            );

            const result = await agent.run(enviroment, MAX_ACTIONS);

            assert.equal(
                result.terminationReason,
                scenario.expectedTermination,
            );
            assert.ok(result.actionCount <= MAX_ACTIONS);
            assert.equal(
                result.terminationReason === "success",
                result.finalState.isKeyCollected &&
                    result.finalState.isExistUnlocked,
            );

            for (const blockedNode of scenario.blockedNodes) {
                const blockedId = vertexId(blockedNode.x, blockedNode.y);
                assert.equal(
                    result.finalState.pathTree.vertices.includes(blockedId),
                    false,
                );
            }
        });
    }
});
