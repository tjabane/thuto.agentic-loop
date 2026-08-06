import assert from "node:assert/strict";
import test from "node:test";
import { findSecretNumber } from "./index.js";

function captureOutput(action: () => number): {
    result: number;
    output: string[];
} {
    const output: string[] = [];
    const originalLog = console.log;

    console.log = (...values: unknown[]) => {
        output.push(values.join(" "));
    };

    try {
        return { result: action(), output };
    } finally {
        console.log = originalLog;
    }
}

for (const secretNumber of [1, 50, 73, 100]) {
    test(`finds ${secretNumber} within 10 attempts`, () => {
        const { result, output } = captureOutput(() =>
            findSecretNumber(secretNumber),
        );
        const iterations = output.filter((line) =>
            line.startsWith("Iteration "),
        );

        assert.equal(result, secretNumber);
        assert.ok(iterations.length <= 10);
        assert.match(iterations.at(-1) ?? "", / - correct$/);
        assert.equal(
            output.at(-1),
            `Stopped: success. Correct guess: ${secretNumber}`,
        );
    });
}

test("uses previous observations to narrow the search range", () => {
    const { output } = captureOutput(() => findSecretNumber(73));
    const guesses = output
        .filter((line) => line.startsWith("Iteration "))
        .map((line) => Number(/guess (\d+)/.exec(line)?.[1]));

    assert.deepEqual(guesses, [50, 75, 62, 68, 71, 73]);
    assert.ok(guesses.every((guess) => guess >= 1 && guess <= 100));
});

test("reports the safety-limit exit condition", () => {
    const { result, output } = captureOutput(() =>
        findSecretNumber(2_000, 1, 2_000),
    );

    assert.equal(result, -1);
    assert.equal(
        output.at(-1),
        "Stopped: safety limit of 10 guesses reached.",
    );
});

test("rejects a secret number outside the search range", () => {
    assert.throws(
        () => findSecretNumber(101),
        /secret number must be within the search range/i,
    );
});
