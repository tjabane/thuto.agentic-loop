import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { Environment } from "../environment.js";

describe("Environment", () => {
    test("rejects invalid dimensions and positions", () => {
        assert.throws(
            () => new Environment(0, 1, [], { x: 0, y: 0 }, { x: 0, y: 0 }),
            /positive integers/,
        );
        assert.throws(
            () => new Environment(1, 1, [{ x: 1, y: 0 }], { x: 0, y: 0 }, { x: 0, y: 0 }),
            /outside the maze/,
        );
        assert.throws(
            () => new Environment(1, 2, [{ x: 1, y: 0 }], { x: 1, y: 0 }, { x: 0, y: 0 }),
            /Key position cannot be blocked/,
        );
    });

    test("returns a defensive copy of its position", () => {
        const environment = new Environment(
            2,
            2,
            [{ x: 1, y: 1 }],
            { x: 1, y: 0 },
            { x: 0, y: 1 },
        );
        const position = environment.getAgentPosition() as { x: number; y: number };

        position.x = 1;

        assert.deepEqual(environment.getAgentPosition(), { x: 0, y: 0 });
    });

    test("applies key and exit actions only at the internal agent position", () => {
        const environment = new Environment(
            1,
            3,
            [],
            { x: 1, y: 0 },
            { x: 2, y: 0 },
        );

        assert.equal(environment.collectKey(), false);
        assert.equal(environment.unlockExit(), false);
        assert.equal(environment.agentExited(), false);

        environment.changeAgentPosition("right");
        assert.equal(environment.collectKey(), true);
        assert.equal(environment.collectKey(), false);

        environment.changeAgentPosition("right");
        assert.deepEqual(environment.viewCurrentCell(), {
            position: { x: 2, y: 0 },
            isBlocked: false,
            hasKey: false,
            isExit: true,
            isUnlocked: false,
        });
        assert.equal(environment.unlockExit(), true);
        assert.equal(environment.unlockExit(), false);
        assert.equal(environment.viewCurrentCell().isUnlocked, true);
        assert.equal(environment.agentExited(), true);
    });

    test("reports blocked and out-of-bounds moves without changing position", () => {
        const environment = new Environment(
            2,
            2,
            [{ x: 1, y: 0 }],
            { x: 0, y: 1 },
            { x: 1, y: 1 },
        );

        assert.deepEqual(environment.changeAgentPosition("up"), { x: -1, y: -1 });
        assert.deepEqual(environment.changeAgentPosition("right"), { x: -1, y: -1 });
        assert.deepEqual(environment.getAgentPosition(), { x: 0, y: 0 });
    });
});
