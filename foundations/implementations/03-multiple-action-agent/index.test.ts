import assert from "node:assert/strict";
import test from "node:test";

import { Agent } from "./agent.js";
import { Environment } from "./enviroment.js";
import type { Direction, Position } from "./types.js";

/**
 * The maze diagrams below run `x` across and `y` down, matching `Position` and
 * the `maze[y][x]` indexing inside `Environment`. Column and row numbers frame
 * each grid.
 *
 * ```
 * A  agent start     #  wall
 * K  key             E  exit
 * .  open cell
 * ```
 */

/**
 * A1 - the four moves that succeed from the centre of an open 3x3 maze.
 *
 * ```
 *     0 1 2
 *   0 . . K
 *   1 . A .
 *   2 . . E
 * ```
 *
 * @remarks
 * Shared with A2, which walls off these same four neighbours so that every
 * direction is refused instead.
 */
const openMoves: { direction: Direction; expected: Position }[] = [
    { direction: "up", expected: { x: 1, y: 0 } },
    { direction: "down", expected: { x: 1, y: 2 } },
    { direction: "left", expected: { x: 0, y: 1 } },
    { direction: "right", expected: { x: 2, y: 1 } },
];

for (const { direction, expected } of openMoves) {
    test(`agent moves ${direction} by one cell`, () => {
        const middle = { x: 1, y: 1 };
        const testEnvironment = new Environment(3, 3, [], { x: 2, y: 0 }, { x: 2, y: 2 }, middle);
        const testAgent = new Agent(middle);

        testAgent.ActOnAction({ type: "move", direction }, testEnvironment);

        assert.deepEqual(testEnvironment.getAgentPostion(), expected);
    });
}

/**
 * A2 - a wall in every direction, so no move can land.
 *
 * ```
 *     0 1 2
 *   0 K # .
 *   1 # A #
 *   2 . # E
 * ```
 *
 * @remarks
 * Exercises the refusal branch of `Environment.changeAgentPosition`, which
 * returns the `{ x: -1, y: -1 }` sentinel rather than a position.
 */
for (const { direction } of openMoves) {
    test(`agent stays put when a wall blocks it moving ${direction}`, () => {
        const middle = { x: 1, y: 1 };
        const walls = [{ x: 1, y: 0 }, { x: 1, y: 2 }, { x: 0, y: 1 }, { x: 2, y: 1 }];
        const testEnvironment = new Environment(3, 3, walls, { x: 0, y: 0 }, { x: 2, y: 2 }, middle);
        const testAgent = new Agent(middle);

        testAgent.ActOnAction({ type: "move", direction }, testEnvironment);

        assert.deepEqual(testEnvironment.getAgentPostion(), { x: 1, y: 1 });
    });
}

/**
 * A3 - corner positions paired with a direction that leaves the maze.
 *
 * ```
 *     0 1 2
 *   0 A K .    <- up and left from (0, 0)
 *   1 . . .
 *   2 . E A    <- down and right from (2, 2)
 * ```
 *
 * @remarks
 * Distinct from A2: no wall is involved, so this pins the bounds half of the
 * condition in `Environment.changeAgentPosition` rather than the maze lookup.
 */
const edgeMoves: { start: Position; direction: Direction }[] = [
    { start: { x: 0, y: 0 }, direction: "up" },
    { start: { x: 0, y: 0 }, direction: "left" },
    { start: { x: 2, y: 2 }, direction: "down" },
    { start: { x: 2, y: 2 }, direction: "right" },
];

for (const { start, direction } of edgeMoves) {
    test(`agent stays put moving ${direction} off the edge at (${start.x}, ${start.y})`, () => {
        const testEnvironment = new Environment(3, 3, [], { x: 1, y: 0 }, { x: 1, y: 2 }, start);
        const testAgent = new Agent(start);

        testAgent.ActOnAction({ type: "move", direction }, testEnvironment);

        assert.deepEqual(testEnvironment.getAgentPostion(), start);
    });
}

/**
 * A4 - rows and columns are not interchangeable, so each axis is walked to its
 * own limit.
 *
 * ```
 *     0 1 2 3
 *   0 A . . .    right until x stops at 3
 *   1 E . . K    then down until y stops at 1
 * ```
 *
 * @remarks
 * Every other test here uses a square maze and would stay green if the row and
 * column arguments were ever swapped in the `Environment` constructor.
 */
test("agent respects the bounds of a non-square maze of 2 rows and 4 columns", () => {
    const start = { x: 0, y: 0 };
    const testEnvironment = new Environment(2, 4, [], { x: 3, y: 1 }, { x: 0, y: 1 }, start);
    const testAgent = new Agent(start);

    for (let step = 0; step < 5; step++) {
        testAgent.ActOnAction({ type: "move", direction: "right" }, testEnvironment);
    }

    assert.deepEqual(testEnvironment.getAgentPostion(), { x: 3, y: 0 });

    for (let step = 0; step < 5; step++) {
        testAgent.ActOnAction({ type: "move", direction: "down" }, testEnvironment);
    }

    assert.deepEqual(testEnvironment.getAgentPostion(), { x: 3, y: 1 });
});

/**
 * A5 - a wall splits the maze, so the only route to (2, 0) is the long way
 * round.
 *
 * ```
 *     0 1 2
 *   0 A # K    right is refused, so the agent goes
 *   1 . # .    down, down, right, right, up, up
 *   2 E . .
 * ```
 *
 * @remarks
 * The first assertion is load-bearing: without it a wall that stopped working
 * would let the detour arrive at (2, 0) anyway and the test would pass while
 * proving nothing.
 */
test("agent reaches the far corner by walking around a wall", () => {
    const start = { x: 0, y: 0 };
    const walls = [{ x: 1, y: 0 }, { x: 1, y: 1 }];
    const testEnvironment = new Environment(3, 3, walls, { x: 2, y: 0 }, { x: 0, y: 2 }, start);
    const testAgent = new Agent(start);

    testAgent.ActOnAction({ type: "move", direction: "right" }, testEnvironment);

    assert.deepEqual(testEnvironment.getAgentPostion(), start);

    const detour: Direction[] = ["down", "down", "right", "right", "up", "up"];
    for (const direction of detour) {
        testAgent.ActOnAction({ type: "move", direction }, testEnvironment);
    }

    assert.deepEqual(testEnvironment.getAgentPostion(), { x: 2, y: 0 });
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

    const keyRoomAfterTake = testEnvironment.viewCell({ x: 2, y: 0 });
    assert.equal(keyRoomAfterTake.hasKey, false);
});

/**
 * B2 - stepping back onto a visited cell should re-read whether a key is there.
 *
 * ```
 *     0 1 2
 *   0 A K .    inspect, step right, inspect, step back, inspect
 *   1 . . .
 *   2 . . E
 * ```
 *
 * @remarks
 * Expected to fail against the current `Agent`. `InspectCell` returns early on a
 * cell it has already observed, so `cellHasKey` still describes (1, 0) once the
 * agent is back on the empty cell at (0, 0).
 *
 * The damage is worse than one wrong answer. Acting on that `takeKey` calls
 * `collectKey({ x: 0, y: 0 })`, which returns `false` and changes nothing, so
 * `cellHasKey` stays `true` and the next `think()` says `takeKey` again. That is
 * a livelock, not a single wrong step.
 *
 * The key is deliberately never collected here. Taking it sets `hasKey`, which
 * short-circuits the `!this.hasKey && this.cellHasKey` guard in `think()` and
 * hides the stale flag behind a correct-looking answer.
 */
test("agent re-reads the key flag when it returns to a visited cell", () => {
    const start = { x: 0, y: 0 };
    const testEnvironment = new Environment(3, 3, [], { x: 1, y: 0 }, { x: 2, y: 2 }, start);
    const testAgent = new Agent(start);

    testAgent.InspectCell(testEnvironment);

    testAgent.ActOnAction({ type: "move", direction: "right" }, testEnvironment);
    testAgent.InspectCell(testEnvironment);

    assert.equal(testAgent.think().type, "takeKey");

    testAgent.ActOnAction({ type: "move", direction: "left" }, testEnvironment);
    testAgent.InspectCell(testEnvironment);

    assert.equal(testAgent.think().type, "move");
});

/**
 * B3 - the same staleness, seen through the exit flag instead of the key flag.
 *
 * ```
 *     0 1 2
 *   0 A E .    the agent already holds the key
 *   1 . . .
 *   2 . . K
 * ```
 *
 * @remarks
 * Expected to fail against the current `Agent`, for the same reason as B2:
 * `isAtExist` still describes the exit at (1, 0) after the agent walks back to
 * (0, 0), so `think()` proposes unlocking an exit it is not standing on.
 *
 * Kept separate from B2 rather than merged. Both share one cause, but a fix that
 * refreshes only `cellHasKey` would turn B2 green and leave this one red, which
 * is exactly the signal wanted.
 */
test("agent re-reads the exit flag when it returns to a visited cell", () => {
    const start = { x: 0, y: 0 };
    const testEnvironment = new Environment(3, 3, [], { x: 2, y: 2 }, { x: 1, y: 0 }, start);
    const testAgent = new Agent(start, true);

    testAgent.InspectCell(testEnvironment);

    testAgent.ActOnAction({ type: "move", direction: "right" }, testEnvironment);
    testAgent.InspectCell(testEnvironment);

    assert.equal(testAgent.think().type, "unlockExit");

    testAgent.ActOnAction({ type: "move", direction: "left" }, testEnvironment);
    testAgent.InspectCell(testEnvironment);

    assert.equal(testAgent.think().type, "move");
});

/**
 * C1 - no key held and one underfoot, so the decision is `takeKey`.
 *
 * ```
 *     0 1 2
 *   0 . . .
 *   1 . K .    <- agent starts here, on the key
 *   2 . . E
 * ```
 *
 * @remarks
 * The agent starts on the key rather than walking to it, so this asserts the
 * branch of `think()` on its own. The existing "agent picks up the key after
 * inspecting the key cell" test covers the same branch but through two moves and
 * an `ActOnAction`, which makes it a test of the pickup taking effect. This one
 * fails only if the decision itself is wrong.
 */
test("agent chooses takeKey when it has no key and is standing on one", () => {
    const keyPosition = { x: 1, y: 1 };
    const testEnvironment = new Environment(3, 3, [], keyPosition, { x: 2, y: 2 }, keyPosition);
    const testAgent = new Agent(keyPosition);

    testAgent.InspectCell(testEnvironment);

    const action = testAgent.think();

    assert.deepEqual(action, { type: "takeKey" });
});

/**
 * C2 - key held, standing on the exit, exit still locked, so unlock it.
 *
 * ```
 *     0 1 2
 *   0 . . K
 *   1 . E .    <- agent starts here, already holding a key
 *   2 . . .
 * ```
 *
 * @remarks
 * Two caveats worth knowing about this one, neither of which it can catch.
 *
 * It passes on a pair of cancelling naming errors. `Environment.viewCell` reports
 * `isUnlocked` but stores `isExitLocked` in it, and `InspectCell` then reads that
 * into `cellIsLocked`. The value ends up correct; both names are backwards.
 * Correcting either side alone turns this test red.
 *
 * The agent is also given its key by the constructor, which sets `Agent.hasKey`
 * without setting `Environment.isKeyCollected`. The two disagree, so a real
 * `unlockExit` here would be refused. This test only reads the decision and never
 * acts on it, so it never runs into that - see C3, which has to collect the key
 * properly for exactly this reason.
 */
test("agent chooses unlockExit when it is at the locked exit with the key", () => {
    const exitPosition = { x: 1, y: 1 };
    const testEnvironment = new Environment(
        3,
        3,
        [],
        { x: 2, y: 0 },
        exitPosition,
        exitPosition,
    );
    const testAgent = new Agent(exitPosition, true);

    testAgent.InspectCell(testEnvironment);

    const action = testAgent.think();

    assert.deepEqual(action, { type: "unlockExit" });
});

/**
 * C3 - the exit has just been unlocked, so the decision becomes `exit`.
 *
 * ```
 *     0 1 2
 *   0 K E .    <- start on the key, take it, step right onto the exit
 *   1 . . .
 *   2 . . .
 * ```
 *
 * @remarks
 * Expected to fail against the current `Agent`, and this is the branch that ends
 * the maze, so today the run never terminates.
 *
 * Same root cause as B2 and B3, reached from a third direction. Here the agent
 * does not move at all between the unlock and the re-inspection - the cell itself
 * changes underneath a cached observation. `InspectCell` returns early because
 * the exit has been seen before, `cellIsLocked` stays `true`, and `think()`
 * proposes `unlockExit` again. Unlocking an already-unlocked exit changes
 * nothing, so it proposes it forever.
 *
 * The key is collected through the environment rather than handed over by the
 * constructor. `Environment.unlockExit` checks its own `isKeyCollected`, so the
 * C2 shortcut of `new Agent(position, true)` would leave the exit locked and make
 * this test red for the wrong reason. The `agentExisted` assertion guards that:
 * it confirms the unlock genuinely landed before the interesting assertion runs.
 */
test("agent chooses exit when it is standing on the exit it has just unlocked", () => {
    const start = { x: 0, y: 0 };
    const exitPosition = { x: 1, y: 0 };
    const testEnvironment = new Environment(3, 3, [], start, exitPosition, start);
    const testAgent = new Agent(start);

    testAgent.InspectCell(testEnvironment);
    testAgent.ActOnAction({ type: "takeKey" }, testEnvironment);

    testAgent.ActOnAction({ type: "move", direction: "right" }, testEnvironment);
    testAgent.InspectCell(testEnvironment);

    assert.equal(testAgent.think().type, "unlockExit");

    testAgent.ActOnAction({ type: "unlockExit" }, testEnvironment);

    assert.equal(testEnvironment.agentExisted(exitPosition), true);

    testAgent.InspectCell(testEnvironment);

    assert.equal(testAgent.think().type, "exit");
});

/**
 * C4 - on the exit but empty handed, so fall through to moving.
 *
 * ```
 *     0 1 2
 *   0 . . .
 *   1 . E .    <- agent starts here, on the locked exit, with no key
 *   2 . . K
 * ```
 *
 * @remarks
 * A guard rather than a discovery. It holds the line against a later edit that
 * drops the `hasKey` conjunct from the `unlockExit` branch or reorders the
 * branches so an earlier one captures this case.
 *
 * Only the action type is asserted. The fall-through branch fills in a direction
 * from `getRandomDirection`, which is not deterministic.
 */
test("agent does not choose unlockExit when it is at the exit without a key", () => {
    const exitPosition = { x: 1, y: 1 };
    const testEnvironment = new Environment(3, 3, [], { x: 2, y: 2 }, exitPosition, exitPosition);
    const testAgent = new Agent(exitPosition);

    testAgent.InspectCell(testEnvironment);

    assert.equal(testAgent.think().type, "move");
});

/**
 * D1 - taking a key that is not underfoot collects nothing.
 *
 * ```
 *     0 1 2
 *   0 A K .    takeKey is attempted at (0, 0), one cell short of the key
 *   1 . . .
 *   2 . . E
 * ```
 *
 * @remarks
 * `Environment.collectKey` returns `false` here, and `Agent.TakeKey` only sets
 * `hasKey` when that comes back `true`. Both halves are checked: the key is still
 * in the maze, and the agent still wants to take one when it finally reaches it.
 * That second assertion stands in for reading `hasKey` directly, which is private
 * and has no getter.
 */
test("agent collects nothing when it takes a key from the wrong cell", () => {
    const start = { x: 0, y: 0 };
    const keyPosition = { x: 1, y: 0 };
    const testEnvironment = new Environment(3, 3, [], keyPosition, { x: 2, y: 2 }, start);
    const testAgent = new Agent(start);

    testAgent.ActOnAction({ type: "takeKey" }, testEnvironment);

    assert.equal(testEnvironment.viewCell(keyPosition).hasKey, true);

    testAgent.ActOnAction({ type: "move", direction: "right" }, testEnvironment);
    testAgent.InspectCell(testEnvironment);

    assert.equal(testAgent.think().type, "takeKey");
});

/**
 * D2 - the exit will not unlock for an agent that is not carrying the key.
 *
 * ```
 *     0 1 2
 *   0 . . .
 *   1 . E .    <- agent starts on the locked exit, key still out at (2, 2)
 *   2 . . K
 * ```
 *
 * @remarks
 * `agentExisted` is the assertion rather than `viewCell(...).isUnlocked`, because
 * that field holds `isExitLocked` and reads backwards. `agentExisted` returning
 * `false` says the thing we actually mean: the exit is not passable.
 */
test("agent cannot unlock the exit without the key", () => {
    const exitPosition = { x: 1, y: 1 };
    const testEnvironment = new Environment(3, 3, [], { x: 2, y: 2 }, exitPosition, exitPosition);
    const testAgent = new Agent(exitPosition);

    testAgent.ActOnAction({ type: "unlockExit" }, testEnvironment);

    assert.equal(testEnvironment.agentExisted(exitPosition), false);
});

/**
 * D3 - holding the key is not enough; the exit has to be unlocked first.
 *
 * ```
 *     0 1 2
 *   0 K E .    take the key, step onto the exit, then leave without unlocking
 *   1 . . .
 *   2 . . .
 * ```
 *
 * @remarks
 * The key is collected properly rather than handed over by the constructor, so
 * the agent and the environment agree about it. That isolates what is being
 * tested: `Environment.agentExisted` gates on the lock alone, so a genuine
 * key-holder standing on a still-locked exit is refused.
 */
test("agent cannot exit through an exit it has not unlocked", () => {
    const start = { x: 0, y: 0 };
    const exitPosition = { x: 1, y: 0 };
    const testEnvironment = new Environment(3, 3, [], start, exitPosition, start);
    const testAgent = new Agent(start);

    testAgent.InspectCell(testEnvironment);
    testAgent.ActOnAction({ type: "takeKey" }, testEnvironment);

    testAgent.ActOnAction({ type: "move", direction: "right" }, testEnvironment);
    testAgent.ActOnAction({ type: "exit" }, testEnvironment);

    assert.equal(testEnvironment.agentExisted(exitPosition), false);
});

/**
 * D4 - the whole run, from the starting corner to a solved maze.
 *
 * ```
 *     0 1 2
 *   0 A . K    right, right, take the key
 *   1 . . .
 *   2 . . E    down, down, unlock, leave
 * ```
 *
 * @remarks
 * The end-to-end case. Each of the three decisions is asserted through `think()`
 * before it is acted on, so a failure names the step that broke rather than just
 * reporting that the maze went unsolved.
 *
 * Moves are issued directly instead of coming from `think()`. The fall-through
 * branch picks a random direction, so a self-driving agent could not be asserted
 * against a fixed route.
 */
test("agent solves the maze by taking the key, unlocking the exit and leaving", () => {
    const start = { x: 0, y: 0 };
    const exitPosition = { x: 2, y: 2 };
    const testEnvironment = new Environment(3, 3, [], { x: 2, y: 0 }, exitPosition, start);
    const testAgent = new Agent(start);

    testAgent.ActOnAction({ type: "move", direction: "right" }, testEnvironment);
    testAgent.ActOnAction({ type: "move", direction: "right" }, testEnvironment);
    testAgent.InspectCell(testEnvironment);

    assert.equal(testAgent.think().type, "takeKey");
    testAgent.ActOnAction({ type: "takeKey" }, testEnvironment);

    testAgent.ActOnAction({ type: "move", direction: "down" }, testEnvironment);
    testAgent.ActOnAction({ type: "move", direction: "down" }, testEnvironment);
    testAgent.InspectCell(testEnvironment);

    assert.equal(testAgent.think().type, "unlockExit");
    testAgent.ActOnAction({ type: "unlockExit" }, testEnvironment);

    testAgent.InspectCell(testEnvironment);

    assert.equal(testAgent.think().type, "exit");
    testAgent.ActOnAction({ type: "exit" }, testEnvironment);

    assert.equal(testEnvironment.agentExisted(exitPosition), true);
});
