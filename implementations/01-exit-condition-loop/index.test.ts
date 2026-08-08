import assert from "node:assert/strict";
import test from "node:test";
import { findSecretNumber } from "./index.js";


test("Can find the secret number when its the edge case: 1", () => {
    const secretNumber: number = 1;
    const result = findSecretNumber(secretNumber);
    assert.equal(result, secretNumber);
});

test("Can find the secret number when its the edge case: 100", () => {
    const secretNumber: number = 100;
    const result = findSecretNumber(secretNumber);
    assert.equal(result, secretNumber);
});

test("Can find the secret number when its in the middle: 50", () => {
    const secretNumber: number = 50;
    const result = findSecretNumber(secretNumber);
    assert.equal(result, secretNumber);
});

test("Can find the secret number when its 73", () => {
    const secretNumber: number = 73;
    const result = findSecretNumber(secretNumber);
    assert.equal(result, secretNumber);
});