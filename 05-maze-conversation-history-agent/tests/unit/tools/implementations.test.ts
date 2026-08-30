import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { Enviroment } from "../../../src/enviroment.js";
import { GetStateTool } from "../../../src/tools/implementations/get-state-tool.js";
import { InspectCurrentNodeTool } from "../../../src/tools/implementations/inspect-current-node-tool.js";
import { MoveTool } from "../../../src/tools/implementations/move-tool.js";
import { NoResultTool } from "../../../src/tools/implementations/no-result-tool.js";
import { TakeKeyTool } from "../../../src/tools/implementations/take-key-tool.js";
import { UnlockExitTool } from "../../../src/tools/implementations/unlock-exit-tool.js";
import {
    EMPTY_TOOL_INPUT_SCHEMA,
    isValidToolInput,
    MOVE_TOOL_INPUT_SCHEMA,
} from "../../../src/tools/schemas.js";

function createEnviroment(): Enviroment {
    return new Enviroment(2, { x: 1, y: 0 }, { x: 1, y: 1 }, new Set());
}

describe("environment tool implementations", () => {
    test("NoResultTool reports an unavailable requested tool", async () => {
        const tool = new NoResultTool("teleport");

        assert.equal(tool.name, "teleport");
        assert.deepEqual(await tool.execute({ x: 1, y: 1 }), {
            success: false,
            message: 'Requested tool "teleport" is unavailable.',
        });
    });

    test("validates raw inputs from their declared schemas", () => {
        assert.equal(isValidToolInput({ direction: "right" }, MOVE_TOOL_INPUT_SCHEMA), true);
        assert.equal(isValidToolInput({ direction: "sideways" }, MOVE_TOOL_INPUT_SCHEMA), false);
        assert.equal(isValidToolInput({ direction: 1 }, MOVE_TOOL_INPUT_SCHEMA), false);
        assert.equal(isValidToolInput({}, MOVE_TOOL_INPUT_SCHEMA), false);
        assert.equal(isValidToolInput({ direction: "right", extra: true }, MOVE_TOOL_INPUT_SCHEMA), false);
        assert.equal(isValidToolInput({}, EMPTY_TOOL_INPUT_SCHEMA), true);
        assert.equal(isValidToolInput([], EMPTY_TOOL_INPUT_SCHEMA), false);
        assert.equal(isValidToolInput({ extra: true }, EMPTY_TOOL_INPUT_SCHEMA), false);
    });

    test("MoveTool validates directions and reports the verified position", async () => {
        const enviroment = createEnviroment();
        const tool = new MoveTool(enviroment);

        assert.equal(tool.name, "move");
        assert.deepEqual(await tool.execute({ direction: "right" }), {
            success: true,
            message: "Agent moved successfully.",
            data: { position: { x: 1, y: 0 } },
        });
        assert.deepEqual(await tool.execute({ direction: "sideways" }), {
            success: false,
            message: "Move requires exactly one valid direction.",
        });
        assert.deepEqual(enviroment.getState().agentPostion, { x: 1, y: 0 });
    });

    test("MoveTool reports an unsuccessful move when the environment blocks it", async () => {
        const tool = new MoveTool(createEnviroment());

        assert.deepEqual(await tool.execute({ direction: "up" }), {
            success: false,
            message: "Agent could not move in that direction.",
            data: { position: { x: 0, y: 0 } },
        });
    });

    test("TakeKeyTool collects a key only at the current node", async () => {
        const enviroment = createEnviroment();
        const tool = new TakeKeyTool(enviroment);

        assert.deepEqual(await tool.execute({}), {
            success: false,
            message: "No uncollected key is at the current location.",
        });

        enviroment.move("right");
        assert.deepEqual(await tool.execute({}), {
            success: true,
            message: "Key collected.",
        });
        assert.deepEqual(await tool.execute({ unexpected: true }), {
            success: false,
            message: "Taking the key does not accept arguments.",
        });
    });

    test("UnlockExitTool unlocks only after the key is collected at the exit", async () => {
        const enviroment = createEnviroment();
        const tool = new UnlockExitTool(enviroment);

        assert.deepEqual(await tool.execute({}), {
            success: false,
            message: "The exit could not be unlocked here.",
        });

        enviroment.move("right");
        enviroment.takeKey();
        enviroment.move("down");
        assert.deepEqual(await tool.execute({}), {
            success: true,
            message: "Exit unlocked.",
        });
        assert.deepEqual(await tool.execute({ extra: true }), {
            success: false,
            message: "Unlocking the exit does not accept arguments.",
        });
    });

    test("GetStateTool returns the environment's verified state", async () => {
        const tool = new GetStateTool(createEnviroment());

        assert.deepEqual(await tool.execute({}), {
            success: true,
            message: "Current maze state retrieved.",
            data: {
                keyPosition: { x: 1, y: 0 },
                existPosition: { x: 1, y: 1 },
                agentPostion: { x: 0, y: 0 },
                isKeyTaken: false,
                isExistLocked: true,
            },
        });
        assert.deepEqual(await tool.execute({ verbose: true }), {
            success: false,
            message: "Getting state does not accept arguments.",
        });
    });

    test("InspectCurrentNodeTool returns only the current node observation", async () => {
        const enviroment = createEnviroment();
        const tool = new InspectCurrentNodeTool(enviroment);

        enviroment.move("right");
        assert.deepEqual(await tool.execute({}), {
            success: true,
            message: "Current node inspected.",
            data: {
                position: { x: 1, y: 0 },
                hasKey: true,
                hasExit: false,
                isExitLocked: true,
            },
        });
        assert.deepEqual(await tool.execute({ position: { x: 1, y: 0 } }), {
            success: false,
            message: "Inspecting the current node does not accept arguments.",
        });
    });
});
