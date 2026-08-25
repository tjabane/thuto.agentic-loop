import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type OpenAI from "openai";

import { Enviroment } from "../../../04-maze-llm-agent/src/enviroment.js";
import type {
    Position,
    State,
} from "../../../04-maze-llm-agent/src/models/position.js";
import { Agent } from "../../src/agent.js";
import {
    type ILLMClient,
    LLMClient,
    type LLMResponse,
} from "../../src/llm/client.js";
import { createMazeTools } from "../../src/tools/maze-tools.js";
import type { ToolResult } from "../../src/tools/tool.js";

const LIVE_TESTS_ENABLED = process.env.RUN_LIVE_CONVERSATION_TESTS === "true";
const MODEL = process.env.OPENAI_MODEL ?? "gpt-5";
const MAX_TURNS = Number(process.env.LLM_E2E_MAX_ACTIONS ?? 25);
const LIVE_TEST_TIMEOUT_MS = 5 * 60 * 1000;

type MazeScenario = {
    name: string;
    size: number;
    keyPosition: Position;
    exitPosition: Position;
    blockedNodes: Position[];
    expectedSuccess: boolean;
    expectedKeyCollected?: boolean;
};

type ToolTraceEntry = {
    name: string;
    input: unknown;
    result: ToolResult;
};

type ScenarioResult = {
    finalState: State;
    finalResponse?: string;
    reachedTurnLimit: boolean;
    modelRequestCount: number;
    toolTrace: ToolTraceEntry[];
};

const scenarios: MazeScenario[] = [
    {
        name: "key and exit share the starting node",
        size: 1,
        keyPosition: { x: 0, y: 0 },
        exitPosition: { x: 0, y: 0 },
        blockedNodes: [],
        expectedSuccess: true,
        expectedKeyCollected: true,
    },
    {
        name: "key is encountered before the exit",
        size: 3,
        keyPosition: { x: 1, y: 0 },
        exitPosition: { x: 2, y: 0 },
        blockedNodes: [],
        expectedSuccess: true,
        expectedKeyCollected: true,
    },
    {
        name: "exit is discovered before the key and must be revisited",
        size: 3,
        keyPosition: { x: 0, y: 1 },
        exitPosition: { x: 1, y: 0 },
        blockedNodes: [{ x: 1, y: 1 }],
        expectedSuccess: true,
        expectedKeyCollected: true,
    },
    {
        name: "a blocked direct route has a valid alternative",
        size: 3,
        keyPosition: { x: 2, y: 0 },
        exitPosition: { x: 2, y: 2 },
        blockedNodes: [{ x: 1, y: 0 }],
        expectedSuccess: true,
        expectedKeyCollected: true,
    },
    {
        name: "the key is unreachable",
        size: 3,
        keyPosition: { x: 2, y: 2 },
        exitPosition: { x: 0, y: 2 },
        blockedNodes: [
            { x: 1, y: 2 },
            { x: 2, y: 1 },
        ],
        expectedSuccess: false,
        expectedKeyCollected: false,
    },
    {
        name: "the exit is unreachable after collecting the key",
        size: 3,
        keyPosition: { x: 0, y: 0 },
        exitPosition: { x: 2, y: 2 },
        blockedNodes: [
            { x: 1, y: 2 },
            { x: 2, y: 1 },
        ],
        expectedSuccess: false,
        expectedKeyCollected: true,
    },
];

class CountingLLMClient implements ILLMClient {
    requestCount = 0;

    constructor(private readonly client: ILLMClient) {}

    async getResponse(
        input: OpenAI.Responses.ResponseInput,
        tools: OpenAI.Responses.FunctionTool[],
    ): Promise<LLMResponse> {
        this.requestCount += 1;
        return this.client.getResponse(input, tools);
    }
}

async function runScenario(scenario: MazeScenario): Promise<ScenarioResult> {
    const enviroment = new Enviroment(
        scenario.size,
        scenario.keyPosition,
        scenario.exitPosition,
        new Set(scenario.blockedNodes),
    );
    const toolTrace: ToolTraceEntry[] = [];
    const tools = createMazeTools(enviroment).map((tool) => ({
        ...tool,
        async execute(input: unknown) {
            const result = await tool.execute(input);
            toolTrace.push({ name: tool.name, input, result });
            return result;
        },
    }));
    const client = new CountingLLMClient(new LLMClient({ model: MODEL }));
    const agent = new Agent(
        `Explore an unknown square maze using only the available tools.
        Find and take the key, then find and unlock the exit.
        Tool results in this conversation are your only memory of the maze.
        Explore systematically, remember failed moves, and avoid repeating actions that made no progress.
        Request one tool at a time.
        Return a final response only after unlockExit succeeds or after you have exhausted every reachable route.`,
        tools,
        client,
    );

    let finalResponse: string | undefined;
    let reachedTurnLimit = false;

    try {
        finalResponse = await agent.run(MAX_TURNS);
    } catch (error) {
        if (
            error instanceof Error &&
            error.message === "Maximum number of turns reached"
        ) {
            reachedTurnLimit = true;
        } else {
            throw error;
        }
    }

    return {
        finalState: enviroment.getState(),
        ...(finalResponse === undefined ? {} : { finalResponse }),
        reachedTurnLimit,
        modelRequestCount: client.requestCount,
        toolTrace,
    };
}

describe("Conversation-history maze agent live scenarios", {
    concurrency: false,
}, () => {
    for (const scenario of scenarios) {
        test(scenario.name, {
            skip: !LIVE_TESTS_ENABLED,
            timeout: LIVE_TEST_TIMEOUT_MS,
        }, async () => {
            const result = await runScenario(scenario);
            const succeeded = !result.finalState.isExistLocked;

            assert.equal(succeeded, scenario.expectedSuccess);
            assert.ok(result.modelRequestCount <= MAX_TURNS);
            assert.ok(result.toolTrace.length <= MAX_TURNS);
            assert.equal(
                result.finalState.isKeyTaken,
                scenario.expectedKeyCollected,
            );

            if (scenario.expectedSuccess) {
                assert.equal(result.reachedTurnLimit, false);
                assert.ok(result.finalResponse);
                assert.ok(
                    result.toolTrace.some((entry) => entry.name === "inspect"),
                );
                assert.ok(
                    result.toolTrace.some(
                        (entry) =>
                            entry.name === "takeKey" &&
                            entry.result.success &&
                            (entry.result.output as { keyTaken?: boolean })
                                .keyTaken === true,
                    ),
                );
                assert.ok(
                    result.toolTrace.some(
                        (entry) =>
                            entry.name === "unlockExit" &&
                            entry.result.success &&
                            (
                                entry.result.output as {
                                    exitUnlocked?: boolean;
                                }
                            ).exitUnlocked === true,
                    ),
                );
            } else {
                assert.equal(result.finalState.isExistLocked, true);
            }

            for (const blockedNode of scenario.blockedNodes) {
                assert.notDeepEqual(
                    result.finalState.agentPostion,
                    blockedNode,
                );
            }
        });
    }
});
