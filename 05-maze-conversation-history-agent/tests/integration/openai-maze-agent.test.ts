import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { Agent } from "../../src/agent.js";
import { OpenAiDecisionClient } from "../../src/decision-client/openai-decision-client.js";
import { Enviroment } from "../../src/enviroment.js";
import { GraphMap } from "../../src/map/graph-map.js";
import { InspectCurrentNodeTool } from "../../src/tools/implementations/inspect-current-node-tool.js";
import { MoveTool } from "../../src/tools/implementations/move-tool.js";
import { ReadMapTool } from "../../src/tools/implementations/map-tools/read-map-tool.js";
import { UpdateMapTool } from "../../src/tools/implementations/map-tools/update-map-tool.js";
import { TakeKeyTool } from "../../src/tools/implementations/take-key-tool.js";
import { UnlockExitTool } from "../../src/tools/implementations/unlock-exit-tool.js";
import type { Tool, ToolResult } from "../../src/tools/tool-contracts.js";

type Position = { readonly x: number; readonly y: number };

type MazeScenario = {
    readonly name: string;
    readonly size: number;
    readonly keyPosition: Position;
    readonly exitPosition: Position;
    readonly blockedNodes: readonly Position[];
    readonly expectedObservations?: readonly ToolResult["data"][];
};

const ATTEMPT_COUNT = 25;
const SYSTEM_PROMPT = `You control an agent in an unknown square maze through the supplied tools.
The goal is to collect the key and unlock the exit. Do not assume the maze layout, item locations, or move outcomes.
Begin by calling inspect_current_node. After every successful move, call inspect_current_node before taking another action.
Use only verified tool results as evidence. A failed move means that route is blocked or outside the maze.
This is a 3x3 maze: track each verified position and move direction, systematically explore unvisited adjacent cells, and do not repeat a known failed move. Collect a discovered key immediately, then navigate directly to any discovered exit.
Call take_key only after an inspection reports a key at the current node. Call unlock_exit only after an inspection reports an exit at the current node and the key is collected.
The map tools are available for bookkeeping, but they are not needed to solve these navigation scenarios; do not call them.
Until a verified tool result confirms the exit is unlocked, you must request exactly one tool per turn. After it is unlocked, request no further tool.`;

class RecordingTool implements Tool {
    public readonly observations: ToolResult[] = [];

    constructor(private readonly inner: Tool) {}

    public get name(): string {
        return this.inner.name;
    }

    public get description(): string {
        return this.inner.description;
    }

    public get inputSchema() {
        return this.inner.inputSchema;
    }

    public async execute(input: unknown): Promise<ToolResult> {
        const result = await this.inner.execute(input);
        this.observations.push(result);
        return result;
    }
}

const SCENARIOS: readonly MazeScenario[] = [
    {
        name: "a direct key-and-exit route",
        size: 3,
        keyPosition: { x: 1, y: 0 },
        exitPosition: { x: 1, y: 1 },
        blockedNodes: [],
    },
    {
        name: "a blocked first route that requires a detour",
        size: 3,
        keyPosition: { x: 2, y: 0 },
        exitPosition: { x: 2, y: 2 },
        blockedNodes: [{ x: 1, y: 0 }],
    },
    {
        name: "a central obstacle between the key and exit",
        size: 3,
        keyPosition: { x: 2, y: 2 },
        exitPosition: { x: 0, y: 2 },
        blockedNodes: [{ x: 1, y: 1 }],
    },
    {
        name: "an exit encountered before the key",
        size: 3,
        keyPosition: { x: 2, y: 0 },
        exitPosition: { x: 1, y: 0 },
        blockedNodes: [
            { x: 0, y: 1 },
            { x: 1, y: 1 },
            { x: 2, y: 1 },
        ],
        expectedObservations: [
            {
                position: { x: 1, y: 0 },
                hasKey: false,
                hasExit: true,
                isExitLocked: true,
            },
            {
                position: { x: 2, y: 0 },
                hasKey: true,
                hasExit: false,
                isExitLocked: true,
            },
        ],
    },
];

describe("OpenAI maze agent integration", () => {
    if (process.env.OPENAI_API_KEY === undefined) {
        test("solves live maze scenarios", { skip: "OPENAI_API_KEY is not configured." }, () => {});
        return;
    }

    for (const scenario of SCENARIOS) {
        test(`solves ${scenario.name}`, { timeout: 120_000 }, async () => {
            const enviroment = new Enviroment(
                scenario.size,
                scenario.keyPosition,
                scenario.exitPosition,
                new Set(scenario.blockedNodes),
            );
            const inspectTool = new RecordingTool(new InspectCurrentNodeTool(enviroment));
            const map = new GraphMap();
            const agent = new Agent(
                [
                    new MoveTool(enviroment),
                    new TakeKeyTool(enviroment),
                    new UnlockExitTool(enviroment),
                    inspectTool,
                    new UpdateMapTool(map),
                    new ReadMapTool(map),
                ],
                new OpenAiDecisionClient({}, SYSTEM_PROMPT),
            );

            await agent.run(ATTEMPT_COUNT);

            assert.deepEqual(enviroment.getState(), {
                keyPosition: scenario.keyPosition,
                existPosition: scenario.exitPosition,
                agentPostion: scenario.exitPosition,
                isKeyTaken: true,
                isExistLocked: false,
            });
            if (scenario.expectedObservations !== undefined) {
                const landmarkObservations = inspectTool.observations
                    .map(observation => observation.data)
                    .filter(data => data?.hasExit === true || data?.hasKey === true);
                const firstExitObservation = landmarkObservations.find(
                    observation => observation?.hasExit === true,
                );
                const firstKeyObservation = landmarkObservations.find(
                    observation => observation?.hasKey === true,
                );

                assert.deepEqual(
                    [firstExitObservation, firstKeyObservation],
                    scenario.expectedObservations,
                );
            }
        });
    }
});
