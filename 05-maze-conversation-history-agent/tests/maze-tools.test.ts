import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { Enviroment } from "../../04-maze-llm-agent/src/enviroment.js";
import type { Position } from "../../04-maze-llm-agent/src/models/position.js";
import { createMazeTools } from "../src/tools/maze-tools.js";
import type { Tool } from "../src/tools/tool.js";

function createEnviroment(
    keyPosition: Position = { x: 2, y: 0 },
    exitPosition: Position = { x: 2, y: 2 },
    blockedNodes: Set<Position> = new Set(),
): Enviroment {
    return new Enviroment(3, keyPosition, exitPosition, blockedNodes);
}

function findTool(tools: Tool[], name: string): Tool {
    const tool = tools.find((candidate) => candidate.name === name);
    assert.ok(tool, `Expected the ${name} tool to exist`);
    return tool;
}

describe("createMazeTools", () => {
    test("describes every exposed environment capability", () => {
        const tools = createMazeTools(createEnviroment());

        assert.deepEqual(
            tools.map((tool) => tool.name),
            ["inspect", "move", "takeKey", "unlockExit"],
        );

        for (const tool of tools) {
            assert.notEqual(tool.description.length, 0);
            assert.equal(tool.inputSchema.type, "object");
        }
    });

    test("inspect returns the current observable node", async () => {
        const inspect = findTool(
            createMazeTools(createEnviroment({ x: 0, y: 0 })),
            "inspect",
        );

        assert.deepEqual(await inspect.execute({}), {
            success: true,
            output: {
                position: { x: 0, y: 0 },
                hasKey: true,
                hasExit: false,
                isExitLocked: true,
            },
        });
    });

    test("move reports a successful environment movement", async () => {
        const move = findTool(createMazeTools(createEnviroment()), "move");

        assert.deepEqual(await move.execute({ direction: "right" }), {
            success: true,
            output: {
                moved: true,
                position: { x: 1, y: 0 },
            },
        });
    });

    test("move reports when the environment rejects a movement", async () => {
        const blockedNodes = new Set<Position>([{ x: 1, y: 0 }]);
        const move = findTool(
            createMazeTools(createEnviroment(undefined, undefined, blockedNodes)),
            "move",
        );

        assert.deepEqual(await move.execute({ direction: "right" }), {
            success: true,
            output: {
                moved: false,
                position: { x: 0, y: 0 },
            },
        });
    });

    test("does not execute move with invalid arguments", async () => {
        const enviroment = createEnviroment();
        const move = findTool(createMazeTools(enviroment), "move");

        assert.deepEqual(await move.execute({ direction: "forward" }), {
            success: false,
            error: "move requires one valid direction",
        });
        assert.deepEqual(enviroment.inspectCurrentNode().position, {
            x: 0,
            y: 0,
        });
    });

    test("takeKey delegates collection to the environment", async () => {
        const takeKey = findTool(
            createMazeTools(createEnviroment({ x: 0, y: 0 })),
            "takeKey",
        );

        assert.deepEqual(await takeKey.execute({}), {
            success: true,
            output: { keyTaken: true },
        });
    });

    test("unlockExit delegates unlocking to the environment", async () => {
        const tools = createMazeTools(
            createEnviroment({ x: 0, y: 0 }, { x: 0, y: 0 }),
        );
        const takeKey = findTool(tools, "takeKey");
        const unlockExit = findTool(tools, "unlockExit");

        await takeKey.execute({});

        assert.deepEqual(await unlockExit.execute({}), {
            success: true,
            output: { exitUnlocked: true },
        });
    });

    test("rejects arguments for tools with empty input schemas", async () => {
        const inspect = findTool(createMazeTools(createEnviroment()), "inspect");

        assert.deepEqual(await inspect.execute({ unexpected: true }), {
            success: false,
            error: "inspect does not accept arguments",
        });
    });
});
