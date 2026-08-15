import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { Agent } from "../agent.js";
import { Environment } from "../environment.js";
import type { Position, TerminationReason } from "../support/types.js";

type MazeConfiguration = {
    name: string;
    rows: number;
    columns: number;
    blockedCells: Position[];
    start: Position;
    key: Position;
    exit: Position;
    seed: number;
    expectedReason: TerminationReason;
    expectedPosition: Position;
};

function runWithSeed(agent: Agent, environment: Environment, seed: number): void {
    const originalRandom = Math.random;
    let state = seed >>> 0;

    Math.random = () => {
        state = (1_664_525 * state + 1_013_904_223) >>> 0;
        return state / 2 ** 32;
    };

    try {
        agent.Run(environment);
    } finally {
        Math.random = originalRandom;
    }
}

describe("Agent maze configurations", () => {
    const configurations: MazeConfiguration[] = [
        {
            name: "single-cell maze with the key and exit at the start",
            rows: 1,
            columns: 1,
            blockedCells: [],
            start: { x: 0, y: 0 },
            key: { x: 0, y: 0 },
            exit: { x: 0, y: 0 },
            seed: 1,
            expectedReason: "success",
            expectedPosition: { x: 0, y: 0 },
        },
        {
            name: "one-row corridor with the exit beyond the key",
            rows: 1,
            columns: 4,
            blockedCells: [],
            start: { x: 0, y: 0 },
            key: { x: 1, y: 0 },
            exit: { x: 3, y: 0 },
            seed: 19,
            expectedReason: "success",
            expectedPosition: { x: 3, y: 0 },
        },
        {
            name: "one-column corridor with the key beyond the exit",
            rows: 4,
            columns: 1,
            blockedCells: [],
            start: { x: 0, y: 0 },
            key: { x: 0, y: 3 },
            exit: { x: 0, y: 1 },
            seed: 7,
            expectedReason: "success",
            expectedPosition: { x: 0, y: 1 },
        },
        {
            name: "three-by-three maze requiring a route around the blocked center",
            rows: 3,
            columns: 3,
            blockedCells: [{ x: 1, y: 1 }],
            start: { x: 0, y: 0 },
            key: { x: 2, y: 0 },
            exit: { x: 2, y: 2 },
            seed: 11,
            expectedReason: "success",
            expectedPosition: { x: 2, y: 2 },
        },
        {
            name: "three-by-three maze with an isolated objective",
            rows: 3,
            columns: 3,
            blockedCells: [
                { x: 1, y: 0 },
                { x: 0, y: 1 },
                { x: 2, y: 1 },
                { x: 1, y: 2 },
            ],
            start: { x: 0, y: 0 },
            key: { x: 1, y: 1 },
            exit: { x: 1, y: 1 },
            seed: 42,
            expectedReason: "unreachable",
            expectedPosition: { x: 0, y: 0 },
        },
    ];

    for (const configuration of configurations) {
        test(configuration.name, () => {
            const environment = new Environment(
                configuration.rows,
                configuration.columns,
                configuration.blockedCells,
                configuration.key,
                configuration.exit,
                configuration.start,
            );
            const agent = new Agent(configuration.start);

            runWithSeed(agent, environment, configuration.seed);

            assert.equal(agent.getTerminationReason(), configuration.expectedReason);
            assert.deepEqual(environment.getAgentPosition(), configuration.expectedPosition);
            assert.ok(agent.getActionCount() <= 25);

            if (configuration.expectedReason === "success") {
                assert.equal(environment.viewCurrentCell().isExit, true);
                assert.equal(environment.viewCurrentCell().isUnlocked, true);
            }
        });
    }
});
