import assert from "node:assert/strict";
import test from "node:test";

import { Agent } from "./agent.js";
import { Environment } from "./enviroment.js";
import { agent, environment } from "./index.js";

test("runs the current starting-room inspection logic", () => {
    agent.InspectCell(environment);

    for(let iteration = 0; iteration < 5; iteration++)
    {
        let action = agent.think()
        agent.ActOnAction(action, environment)
        const agentLocation = environment.getAgentPostion();
    }

});

test("agent picks up the key after inspecting the key cell", () => {
    const testEnvironment = new Environment(
        3,
        3,
        [{ x: 1, y: 1 }],
        { x: 2, y: 0 },
        { x: 2, y: 2 },
    );
    const testAgent = new Agent({ x: 0, y: 0 });

    testAgent.ActOnAction({ type: "move", direction: "right" }, testEnvironment);
    testAgent.ActOnAction({ type: "move", direction: "right" }, testEnvironment);
    testAgent.InspectCell(testEnvironment);

    const action = testAgent.think();
    assert.equal(action.type, "takeKey");

    testAgent.ActOnAction(action, testEnvironment);
    assert.equal(testEnvironment.viewCell({ x: 2, y: 0 }).hasKey, false);
});
