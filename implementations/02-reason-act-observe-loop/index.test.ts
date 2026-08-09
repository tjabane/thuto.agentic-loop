import assert from "node:assert/strict";
import test from "node:test";
import { Agent, Environment } from "./index.js";

function runAgent(secretNumber: number): number {
    const agent = new Agent({
        interval: [1, 100],
        history: [],
        status: "running"
    });
    const environment = new Environment(secretNumber);

    return agent.run(environment, 10);
}

test("Can find the secret number when its the edge case: 1", () => {
    const secretNumber: number = 1;
    const result = runAgent(secretNumber);
    assert.equal(result, secretNumber);
});

test("can find the secret number when its the edge case: 100", () => {
    const secretNumber: number = 100;
    const result = runAgent(secretNumber);
    assert.equal(result, secretNumber);
});

test("can find the secret number when its in the middle: 50", () => {
    const secretNumber: number = 50;
    const result = runAgent(secretNumber);
    assert.equal(result, secretNumber);
});

test("can find the secret number when its 73", () => {
    const secretNumber: number = 73;
    const result = runAgent(secretNumber);
    assert.equal(result, secretNumber);
});
