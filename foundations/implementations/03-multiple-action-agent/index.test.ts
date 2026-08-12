import assert from "node:assert/strict";
import { describe, test } from "node:test";

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
 * How many times a test samples `think()` before judging which directions the
 * agent is willing to propose.
 *
 * @remarks
 * `think()` re-rolls its direction on every call, so one sample proves nothing.
 * An agent that has genuinely ruled a direction out never offers it, however many
 * times it is asked, so a direction missing from a large sample is a real signal.
 * One that is still choosing freely offers each direction about a quarter of the
 * time, and the chance of it dodging one across 100 draws is about 3 in 10^13.
 */
const DIRECTION_SAMPLES = 100;

/**
 * Asks the agent for a move repeatedly and reports every direction it offered.
 *
 * @param testAgent - the agent to question, left standing where it is
 * @returns the distinct directions seen across `DIRECTION_SAMPLES` calls
 *
 * @remarks
 * Only `move` actions contribute. The agent is never told to act, so it stays put
 * and every sample is drawn from the same position.
 */
function offeredDirections(testAgent: Agent): Set<Direction> {
    const offered = new Set<Direction>();

    for (let sample = 0; sample < DIRECTION_SAMPLES; sample++) {
        const action = testAgent.think();
        if (action.type === "move" && action.direction) {
            offered.add(action.direction);
        }
    }

    return offered;
}

describe("A - moving through the maze", () => {
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
});

describe("B - observing the current cell", () => {
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
});

describe("C - deciding the next action", () => {
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
});

describe("D - acting on a decision", () => {
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
});

describe("E - remembering directions that were refused", () => {
    /**
     * E1 - a direction that turned out to be a wall is not offered again.
     *
     * ```
     *     0 1 2
     *   0 A # .    right is refused, and should not be suggested from (0, 0) again
     *   1 . . .
     *   2 E . K
     * ```
     *
     * @remarks
     * Expected to fail. `Move` does record something on a refusal, but it records
     * `this.position` - the cell the agent is standing on, which is walkable by
     * definition - rather than the cell that turned it away. Nothing reads
     * `blockedCells` afterwards in any case, so `getRandomDirection` still offers all
     * four directions.
     *
     * The assertion is about what the agent offers, not about what it stores, so it
     * stays valid whether the fix remembers blocked directions per cell or builds a
     * map of blocked cells.
     */
    test("agent stops offering a direction after a wall refuses it", () => {
        const start = { x: 0, y: 0 };
        const testEnvironment = new Environment(
            3,
            3,
            [{ x: 1, y: 0 }],
            { x: 2, y: 2 },
            { x: 0, y: 2 },
            start,
        );
        const testAgent = new Agent(start);

        testAgent.ActOnAction({ type: "move", direction: "right" }, testEnvironment);

        assert.deepEqual(testEnvironment.getAgentPostion(), start);
        assert.equal(offeredDirections(testAgent).has("right"), false);
    });

    /**
     * E2 - the edge of the maze teaches the same lesson as a wall.
     *
     * ```
     *     0 1 2
     *   0 A . K    up leaves the maze, and should not be suggested from (0, 0) again
     *   1 . . .
     *   2 . . E
     * ```
     *
     * @remarks
     * Expected to fail, for the same reason as E1.
     *
     * `changeAgentPosition` answers a boundary refusal and a wall refusal with the
     * same `{ x: -1, y: -1 }`, so the agent cannot tell them apart even if it wanted
     * to. This test takes the position that it should not need to: a direction that
     * cannot be walked is worth remembering whatever is on the other side.
     */
    test("agent stops offering a direction after the maze edge refuses it", () => {
        const start = { x: 0, y: 0 };
        const testEnvironment = new Environment(3, 3, [], { x: 2, y: 0 }, { x: 2, y: 2 }, start);
        const testAgent = new Agent(start);

        testAgent.ActOnAction({ type: "move", direction: "up" }, testEnvironment);

        assert.equal(offeredDirections(testAgent).has("up"), false);
    });

    /**
     * E3 - what was learned at one cell does not muzzle the agent everywhere.
     *
     * ```
     *     0 1 2
     *   0 A # .    right is a wall from (0, 0)
     *   1 . . .    but perfectly walkable from (0, 1)
     *   2 E . K
     * ```
     *
     * @remarks
     * A guard against overcorrecting. An agent that answered E1 by striking `right`
     * off its list entirely would pass E1 and then refuse to walk half the maze.
     * Passes today only because the agent has no memory at all, so watch that it
     * stays green rather than treating it as already satisfied.
     */
    test("agent still offers a direction that was only blocked at another cell", () => {
        const start = { x: 0, y: 0 };
        const testEnvironment = new Environment(
            3,
            3,
            [{ x: 1, y: 0 }],
            { x: 2, y: 2 },
            { x: 0, y: 2 },
            start,
        );
        const testAgent = new Agent(start);

        testAgent.ActOnAction({ type: "move", direction: "right" }, testEnvironment);
        testAgent.ActOnAction({ type: "move", direction: "down" }, testEnvironment);

        assert.deepEqual(testEnvironment.getAgentPostion(), { x: 0, y: 1 });
        assert.equal(offeredDirections(testAgent).has("right"), true);
    });

    /**
     * E4 - hemmed in on three sides, the only offer left is the open one.
     *
     * ```
     *     0 1 2
     *   0 A # .    up and left leave the maze, right is a wall
     *   1 . . .    down is the only way out of (0, 0)
     *   2 E . K
     * ```
     *
     * @remarks
     * Expected to fail. This is the case that separates a real fix from a partial
     * one: E1 and E2 can be satisfied by remembering a single refusal, while this
     * needs all three held at once and narrows the choice to exactly one direction.
     *
     * It also reaches the corner `getRandomDirection` already anticipates with its
     * "No validate direction Available" throw. Nothing here should trigger it, since
     * one direction remains open, so a thrown error is a genuine failure and not an
     * awkward test.
     */
    test("agent offers only the open direction when three sides have refused it", () => {
        const start = { x: 0, y: 0 };
        const testEnvironment = new Environment(
            3,
            3,
            [{ x: 1, y: 0 }],
            { x: 2, y: 2 },
            { x: 0, y: 2 },
            start,
        );
        const testAgent = new Agent(start);

        testAgent.ActOnAction({ type: "move", direction: "up" }, testEnvironment);
        testAgent.ActOnAction({ type: "move", direction: "left" }, testEnvironment);
        testAgent.ActOnAction({ type: "move", direction: "right" }, testEnvironment);

        assert.deepEqual(testEnvironment.getAgentPostion(), start);
        assert.deepEqual(offeredDirections(testAgent), new Set(["down"]));
    });
});

/**
 * F covers the preference for unexplored cells, and the places where that
 * preference has to yield to something else.
 *
 * @remarks
 * These were written against a measured symptom rather than a guess. Driving the
 * `index.ts` maze the way the visualizer's automatic run does - `InspectCell`,
 * `think`, `ActOnAction`, capped at 50 actions - over 2000 runs:
 *
 * ```
 * solved within 50 actions   94.0%
 * hit the cap                6.0%
 * actions when solved        avg 20.6   min 7   max 50
 * refused moves              6.93 per run
 * ```
 *
 * A maze whose shortest solution is 7 actions takes 20.6 on average and fails
 * outright once in every seventeen attempts. F2 and F5 are the two causes; F3 and
 * F4 hold the line on the parts that already work.
 */
describe("F - preferring cells it has not seen", () => {
    /**
     * F1 - a choice between the cell it came from and one it has never stood on.
     *
     * ```
     *     0 1 2
     *   0 K # .    up and down from (1, 1) are walls
     *   1 . A .    the agent walked in from (0, 1), so only (2, 1) is new
     *   2 . # E
     * ```
     *
     * @remarks
     * Passes. `getRandomDirection` asks `getUnExploredCells` first and only falls back
     * to an even draw over `getValidDirections` when nothing new is on offer.
     *
     * The walls do the narrowing so that the interesting comparison is the only one
     * left. Both surviving directions are walkable and neither is blocked, so `left`
     * can only be ruled out by the agent noticing it has already been to (0, 1) -
     * which is the behaviour under test, and is a different memory from the
     * `blockedCells` memory the E tests cover.
     *
     * `InspectCell` is called at both cells, since a record of where the agent has
     * been is only built there. Note that `observations` cannot serve as that record:
     * `Environment.viewCell` returns a fresh object on every call, so the `Set` grows
     * a new entry per visit and never recognises a repeat. `path` is the honest
     * source, or a set of visited cell keys alongside `blockedCells`.
     *
     * Sampled rather than asserted once, because a `left` that is still in the running
     * would be picked only half the time and a single draw of `right` would prove
     * nothing. `deepEqual` against a one-element set is deliberate: it fails both on an
     * agent that still offers `left` and on one that somehow stops offering `right`.
     */
    test("agent only offers the unexplored direction when the other leads back to a visited cell", () => {
        const start = { x: 0, y: 1 };
        const middle = { x: 1, y: 1 };
        const walls = [{ x: 1, y: 0 }, { x: 1, y: 2 }];
        const testEnvironment = new Environment(
            3,
            3,
            walls,
            { x: 0, y: 0 },
            { x: 2, y: 2 },
            start,
        );
        const testAgent = new Agent(start);

        testAgent.InspectCell(testEnvironment);
        testAgent.ActOnAction({ type: "move", direction: "right" }, testEnvironment);
        testAgent.InspectCell(testEnvironment);

        assert.deepEqual(testEnvironment.getAgentPostion(), middle);

        testAgent.ActOnAction({ type: "move", direction: "up" }, testEnvironment);
        testAgent.ActOnAction({ type: "move", direction: "down" }, testEnvironment);

        assert.deepEqual(testEnvironment.getAgentPostion(), middle);
        assert.deepEqual(offeredDirections(testAgent), new Set(["right"]));
    });

    /**
     * F2 - standing on a cell counts as exploring it, whether or not it was inspected.
     *
     * ```
     *     0 1 2
     *   0 K # .    up and down from (1, 1) are walls
     *   1 . A .    the agent has been to (0, 1) without ever inspecting it
     *   2 . # E
     * ```
     *
     * @remarks
     * Expected to fail. `path` is only appended to in `InspectCell`, so a cell the
     * agent physically walked onto and off again leaves no trace if nothing inspected
     * it. `getUnExploredCells` then reads (0, 1) as new and offers `left` half the
     * time, sending the agent back over ground it has already covered.
     *
     * This is the visualizer discrepancy in miniature. The arrow buttons call
     * `runAction` without `InspectCell`, so every cell reached by hand is invisible to
     * the agent's own memory - drive it manually for a while, press "Run agent", and it
     * explores from a blank slate while the map on screen says otherwise. Nothing in
     * the automatic run does this, which is why it only shows up when the two are
     * mixed.
     *
     * F1 is the same assertion with the inspections left in, and passes. Keeping both
     * separates "does the preference work" from "is the record of where it has been
     * complete", which are different bugs with different fixes. The fix here belongs in
     * `Move` - the position it commits to is the position it has explored - not in the
     * caller, since requiring every caller to inspect is the fragility that caused
     * this.
     */
    test("agent treats a cell it walked through without inspecting as already explored", () => {
        const middle = { x: 1, y: 1 };
        const walls = [{ x: 1, y: 0 }, { x: 1, y: 2 }];
        const testEnvironment = new Environment(
            3,
            3,
            walls,
            { x: 0, y: 0 },
            { x: 2, y: 2 },
            middle,
        );
        const testAgent = new Agent(middle);

        testAgent.ActOnAction({ type: "move", direction: "up" }, testEnvironment);
        testAgent.ActOnAction({ type: "move", direction: "down" }, testEnvironment);

        testAgent.ActOnAction({ type: "move", direction: "left" }, testEnvironment);
        assert.deepEqual(testEnvironment.getAgentPostion(), { x: 0, y: 1 });

        testAgent.ActOnAction({ type: "move", direction: "right" }, testEnvironment);
        testAgent.InspectCell(testEnvironment);

        assert.deepEqual(testEnvironment.getAgentPostion(), middle);
        assert.deepEqual(offeredDirections(testAgent), new Set(["right"]));
    });

    /**
     * F3 - a cell that refused the agent is not "unexplored" waiting to be tried again.
     *
     * ```
     *     0 1 2
     *   0 . # .    right from (0, 0) is a wall, already bumped into once
     *   1 A . .    down and right from (0, 1) have never been visited
     *   2 E . K
     * ```
     *
     * @remarks
     * Passes, and worth keeping precisely because it is one line away from not passing.
     *
     * The agent never stands on a blocked cell, so a blocked cell is never in `path`,
     * so it is unexplored forever by that test alone. The only thing stopping the agent
     * from preferring the wall it just bounced off is the order in
     * `getRandomDirection`: `getUnExploredCells` is handed the output of
     * `getValidDirections`, not all four directions. Widen that input and the agent
     * spends the run headbutting the same wall - the two memories have to compose in
     * that order.
     *
     * The `up` assertion is doing real work too: it confirms the agent is still willing
     * to explore normally here, so a green result cannot come from an agent that has
     * simply stopped offering things.
     */
    test("agent does not treat a blocked cell as unexplored and retry it", () => {
        const start = { x: 0, y: 1 };
        const testEnvironment = new Environment(
            3,
            3,
            [{ x: 1, y: 1 }],
            { x: 2, y: 2 },
            { x: 0, y: 2 },
            start,
        );
        const testAgent = new Agent(start);

        testAgent.InspectCell(testEnvironment);
        testAgent.ActOnAction({ type: "move", direction: "right" }, testEnvironment);

        assert.deepEqual(testEnvironment.getAgentPostion(), start);

        const offered = offeredDirections(testAgent);
        assert.equal(offered.has("right"), false);
        assert.equal(offered.has("up"), true);
    });

    /**
     * F4 - at a dead end, the way back is the only offer left.
     *
     * ```
     *     0 1 2
     *   0 K E A    a one row maze, so the agent is at the end of a corridor
     * ```
     *
     * @remarks
     * Passes. This is the fallback branch of `getRandomDirection`, and the property
     * that keeps the agent alive rather than efficient: when `getUnExploredCells`
     * returns nothing, an even draw over `getValidDirections` still has to produce a
     * direction.
     *
     * Every neighbour of (2, 0) is either off the maze or already visited, so a
     * preference for the unexplored that had no fallback would either throw
     * "No validate direction Available" or return `undefined` and leave `think()`
     * proposing a move with no direction, which `ActOnAction` silently drops. Both
     * failure modes look identical in the visualizer - the agent just stops - so this
     * asserts the direction rather than merely that nothing threw.
     *
     * The maze is one row deep so that up and down are boundary refusals rather than
     * walls, which keeps the three refusals ahead of the assertion honest: they teach
     * the agent something it could not have known in advance.
     */
    test("agent offers the way it came when a dead end leaves nothing new nearby", () => {
        const start = { x: 0, y: 0 };
        const testEnvironment = new Environment(1, 3, [], start, { x: 1, y: 0 }, start);
        const testAgent = new Agent(start);

        testAgent.InspectCell(testEnvironment);
        testAgent.ActOnAction({ type: "move", direction: "right" }, testEnvironment);
        testAgent.InspectCell(testEnvironment);
        testAgent.ActOnAction({ type: "move", direction: "right" }, testEnvironment);
        testAgent.InspectCell(testEnvironment);

        assert.deepEqual(testEnvironment.getAgentPostion(), { x: 2, y: 0 });

        testAgent.ActOnAction({ type: "move", direction: "up" }, testEnvironment);
        testAgent.ActOnAction({ type: "move", direction: "down" }, testEnvironment);
        testAgent.ActOnAction({ type: "move", direction: "right" }, testEnvironment);

        assert.deepEqual(testEnvironment.getAgentPostion(), { x: 2, y: 0 });
        assert.deepEqual(offeredDirections(testAgent), new Set(["left"]));
    });

    /**
     * F5 - curiosity has to stop once the way out is known and openable.
     *
     * ```
     *     0 1 2 3
     *   0 K E A .    key taken, exit unlocked, agent one step past it at (2, 0)
     * ```
     *
     * @remarks
     * Expected to fail, and this is the one that produces the runs that hit the
     * visualizer's 50 action cap. The agent offers `right` towards (3, 0) because it
     * has never been there, walking away from an unlocked exit it is standing next to.
     *
     * `think()` only recognises the exit from on top of it, so the exit is just another
     * explored cell as far as direction choice is concerned - and being explored is
     * exactly what makes the preference avoid it. The further the agent gets, the
     * longer the way back, and once the maze is fully explored the fallback is an even
     * random walk with no pull towards the exit at all. That is the shape of the 6% of
     * runs that never finish: not a wrong decision anywhere, just no decision that ever
     * aims at the goal.
     *
     * The key is collected and the exit genuinely unlocked through the environment
     * rather than faked through the constructor, and both are asserted, so the test
     * cannot pass or fail for a reason unrelated to the choice being made. The maze is
     * four cells wide because three is not enough: at (2, 0) in a three wide maze
     * `left` would be the only valid direction and the agent would return to the exit
     * by having no alternative, proving nothing.
     *
     * Asserting `left` here is asserting a route to a known goal, which is a larger
     * change than the one line F2 needs - the fix is a general "head for the nearest
     * cell I know I want" rather than a special case for adjacency, or this test comes
     * straight back the moment the exit is two cells away.
     */
    test("agent heads back to the unlocked exit instead of exploring further", () => {
        const start = { x: 0, y: 0 };
        const exitPosition = { x: 1, y: 0 };
        const testEnvironment = new Environment(1, 4, [], start, exitPosition, start);
        const testAgent = new Agent(start);

        testAgent.InspectCell(testEnvironment);
        testAgent.ActOnAction({ type: "takeKey" }, testEnvironment);

        testAgent.ActOnAction({ type: "move", direction: "right" }, testEnvironment);
        testAgent.InspectCell(testEnvironment);
        testAgent.ActOnAction({ type: "unlockExit" }, testEnvironment);

        assert.equal(testEnvironment.agentExisted(exitPosition), true);

        testAgent.ActOnAction({ type: "move", direction: "right" }, testEnvironment);
        testAgent.InspectCell(testEnvironment);

        assert.deepEqual(testEnvironment.getAgentPostion(), { x: 2, y: 0 });

        testAgent.ActOnAction({ type: "move", direction: "up" }, testEnvironment);
        testAgent.ActOnAction({ type: "move", direction: "down" }, testEnvironment);

        assert.deepEqual(testEnvironment.getAgentPostion(), { x: 2, y: 0 });
        assert.deepEqual(offeredDirections(testAgent), new Set(["left"]));
    });
});
