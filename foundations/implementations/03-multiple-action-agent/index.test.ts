import assert from "node:assert/strict";
import test from "node:test";

import { agent, environment } from "./index.js";

test("runs the current starting-room inspection logic", () => {
    agent.InspectCell(environment);

    const observation = environment.viewCell({ x: 0, y: 0 });

    assert.deepEqual(observation.currentPosition, { x: 0, y: 0 });
    assert.equal(observation.isBlocked, false);
    assert.equal(observation.hasKey, false);
    assert.equal(observation.isExit, false);
});
