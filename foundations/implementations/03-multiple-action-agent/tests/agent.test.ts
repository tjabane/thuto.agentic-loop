import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { Agent } from "../agent.js";
import { Environment } from "../environment.js";
import type { Direction, Observation, Position } from "../support/types.js";

type RecordedEvent =
    | { type: "inspect"; position: Position }
    | { type: "move"; direction: Direction; result: Position }
    | { type: "takeKey"; position: Position; succeeded: boolean }
    | { type: "unlockExit"; position: Position; succeeded: boolean }
    | { type: "exit"; position: Position; succeeded: boolean };

class RecordingEnvironment extends Environment {
    readonly events: RecordedEvent[] = [];
    private readonly actionLimit: number | undefined;

    constructor(
        numberOfRows: number,
        numberOfColumns: number,
        blockedCells: Position[],
        keyPosition: Position,
        exitPosition: Position,
        agentPosition: Position,
        actionLimit?: number,
    ) {
        super(numberOfRows, numberOfColumns, blockedCells, keyPosition, exitPosition, agentPosition);
        this.actionLimit = actionLimit;
    }

    get actionCount(): number {
        return this.events.filter((event) => event.type !== "inspect").length;
    }

    private guardActionLimit(): void {
        if (this.actionLimit !== undefined && this.actionCount >= this.actionLimit) {
            throw new Error(`Agent attempted action ${this.actionCount + 1}`);
        }
    }

    override viewCurrentCell(): Observation {
        const position = this.getAgentPosition();
        this.events.push({ type: "inspect", position: { ...position } });
        return super.viewCurrentCell();
    }

    override changeAgentPosition(direction: Direction): Position {
        this.guardActionLimit();
        const result = super.changeAgentPosition(direction);
        this.events.push({ type: "move", direction, result: { ...result } });
        return result;
    }

    override collectKey(): boolean {
        this.guardActionLimit();
        const position = this.getAgentPosition();
        const succeeded = super.collectKey();
        this.events.push({ type: "takeKey", position: { ...position }, succeeded });
        return succeeded;
    }

    override unlockExit(): boolean {
        this.guardActionLimit();
        const position = this.getAgentPosition();
        const succeeded = super.unlockExit();
        this.events.push({ type: "unlockExit", position: { ...position }, succeeded });
        return succeeded;
    }

    override agentExited(): boolean {
        this.guardActionLimit();
        const position = this.getAgentPosition();
        const succeeded = super.agentExited();
        this.events.push({ type: "exit", position: { ...position }, succeeded });
        return succeeded;
    }
}

function runWithRandomSequence(agent: Agent, environment: Environment, values: number[]): void {
    const originalRandom = Math.random;
    let nextValue = 0;

    Math.random = () => {
        const value = values[nextValue];
        nextValue++;

        if (value === undefined) {
            throw new Error("Agent requested more random decisions than this scenario permits");
        }

        return value;
    };

    try {
        agent.Run(environment);
    } finally {
        Math.random = originalRandom;
    }
}

function runWithSeed(agent: Agent, environment: Environment, seed: number): void {
    const originalRandom = Math.random;
    let state = seed >>> 0;

    Math.random = () => {
        state = (1_664_525 * state + 1_013_904_223) >>> 0;
        return state / 2 ** 32;
    };

    try {
        agent.Run(environment);
    } finally {
        Math.random = originalRandom;
    }
}

describe("Agent.Run", () => {
    const adjacentExitScenarios: {
        name: string;
        start: Position;
        exit: Position;
        random: number;
        direction: Direction;
    }[] = [
        {
            name: "up",
            start: { x: 1, y: 1 },
            exit: { x: 1, y: 0 },
            random: 0,
            direction: "up",
        },
        {
            name: "down",
            start: { x: 1, y: 1 },
            exit: { x: 1, y: 2 },
            random: 0.3,
            direction: "down",
        },
        {
            name: "left",
            start: { x: 1, y: 1 },
            exit: { x: 0, y: 1 },
            random: 0.6,
            direction: "left",
        },
        {
            name: "right",
            start: { x: 1, y: 1 },
            exit: { x: 2, y: 1 },
            random: 0.9,
            direction: "right",
        },
    ];

    for (const scenario of adjacentExitScenarios) {
        test(`can solve a scenario requiring a ${scenario.name} move`, () => {
            const environment = new RecordingEnvironment(
                3,
                3,
                [],
                scenario.start,
                scenario.exit,
                scenario.start,
            );
            const agent = new Agent(scenario.start);

            runWithRandomSequence(agent, environment, [scenario.random]);

            assert.deepEqual(environment.getAgentPosition(), scenario.exit);
            assert.deepEqual(
                environment.events.filter((event) => event.type === "move"),
                [{ type: "move", direction: scenario.direction, result: scenario.exit }],
            );
            assert.equal(environment.events.at(-1)?.type, "exit");
        });
    }

    test("takes the key, moves to the exit, unlocks it, and exits", () => {
        const start = { x: 0, y: 0 };
        const exit = { x: 1, y: 0 };
        const environment = new RecordingEnvironment(1, 2, [], start, exit, start);
        const agent = new Agent(start);

        runWithRandomSequence(agent, environment, [0.99]);

        assert.deepEqual(environment.getAgentPosition(), exit);
        assert.deepEqual(environment.events, [
            { type: "inspect", position: start },
            { type: "takeKey", position: start, succeeded: true },
            { type: "inspect", position: start },
            { type: "move", direction: "right", result: exit },
            { type: "inspect", position: exit },
            { type: "unlockExit", position: exit, succeeded: true },
            { type: "inspect", position: exit },
            { type: "exit", position: exit, succeeded: true },
        ]);
    });

    test("remembers a blocked move and chooses a route around the wall", () => {
        const start = { x: 0, y: 0 };
        const blocked = { x: 1, y: 0 };
        const exit = { x: 1, y: 1 };
        const environment = new RecordingEnvironment(2, 2, [blocked], start, exit, start);
        const agent = new Agent(start);

        runWithRandomSequence(agent, environment, [0.99, 0.5, 0.99]);

        const moves = environment.events.filter(
            (event): event is Extract<RecordedEvent, { type: "move" }> => event.type === "move",
        );

        assert.deepEqual(moves, [
            { type: "move", direction: "right", result: { x: -1, y: -1 } },
            { type: "move", direction: "down", result: { x: 0, y: 1 } },
            { type: "move", direction: "right", result: exit },
        ]);
        assert.deepEqual(environment.getAgentPosition(), exit);
        assert.equal(
            environment.events.some(
                (event) => event.type === "unlockExit" && event.succeeded,
            ),
            true,
        );
        assert.equal(
            environment.events.at(-1)?.type,
            "exit",
        );
    });

    test("explores an unvisited neighbour instead of returning to the previous cell", () => {
        const start = { x: 0, y: 0 };
        const junction = { x: 1, y: 0 };
        const environment = new Environment(1, 3, [], start, { x: 2, y: 0 }, start);
        const agent = new Agent(start);
        const exploration = agent as unknown as {
            Move(direction: Direction, environment: Environment): void;
        };

        exploration.Move("right", environment);

        assert.deepEqual(environment.getAgentPosition(), junction);
        assert.equal(agent.getTraversalNode(junction)?.attemptedDirections.has("left"), true);
        assert.equal(agent.getTraversalNode(junction)?.attemptedDirections.has("right"), false);
    });

    test("records successful movement as a bidirectional traversal connection", () => {
        const start = { x: 0, y: 0 };
        const destination = { x: 1, y: 0 };
        const environment = new Environment(1, 2, [], start, destination, start);
        const agent = new Agent(start);
        const movement = agent as unknown as {
            Move(direction: Direction, environment: Environment): void;
        };

        movement.Move("right", environment);

        const startNode = agent.getTraversalNode(start);
        const destinationNode = agent.getTraversalNode(destination);
        assert.deepEqual(startNode?.neighbours.right, destination);
        assert.equal(startNode?.attemptedDirections.has("right"), true);
        assert.deepEqual(destinationNode?.neighbours.left, start);
    });

    test("records a failed movement as an attempted blocked direction", () => {
        const start = { x: 0, y: 0 };
        const environment = new Environment(1, 1, [], start, start, start);
        const agent = new Agent(start);
        const movement = agent as unknown as {
            Move(direction: Direction, environment: Environment): void;
        };

        movement.Move("left", environment);

        const startNode = agent.getTraversalNode(start);
        assert.equal(startNode?.attemptedDirections.has("left"), true);
        assert.equal(startNode?.blockedDirections.has("left"), true);
        assert.equal(startNode?.neighbours.left, undefined);
    });

    test("remembers an exit found after collecting the key and enters exploit phase", () => {
        const start = { x: 0, y: 0 };
        const exit = { x: 1, y: 0 };
        const environment = new Environment(1, 2, [], start, exit, start);
        const agent = new Agent(start);
        const actions = agent as unknown as {
            TakeKey(environment: Environment): void;
            Move(direction: Direction, environment: Environment): void;
            observeCell(environment: Environment): void;
        };

        actions.TakeKey(environment);
        assert.equal(agent.getPhase(), "explore");

        actions.Move("right", environment);
        actions.observeCell(environment);

        assert.deepEqual(agent.getExitLocation(), exit);
        assert.equal(agent.getTraversalNode(exit)?.isExit, true);
        assert.equal(agent.getPhase(), "exploit");
    });

    test("routes through known cells to reach a node with an untried direction", () => {
        const start = { x: 0, y: 0 };
        const deadEnd = { x: 1, y: 0 };
        const objective = { x: 0, y: 1 };
        const environment = new RecordingEnvironment(
            2,
            2,
            [{ x: 1, y: 1 }],
            objective,
            objective,
            start,
        );
        const agent = new Agent(start);

        runWithRandomSequence(agent, environment, [0.99, 0, 0, 0, 0.5]);

        const successfulMoves = environment.events.filter(
            (event): event is Extract<RecordedEvent, { type: "move" }> =>
                event.type === "move" && event.result.x !== -1 && event.result.y !== -1,
        );
        assert.deepEqual(successfulMoves, [
            { type: "move", direction: "right", result: deadEnd },
            { type: "move", direction: "left", result: start },
            { type: "move", direction: "down", result: objective },
        ]);
        assert.equal(agent.getTerminationReason(), "success");
    });

    test("terminates as unreachable after exhausting every reachable direction", () => {
        const start = { x: 0, y: 0 };
        const environment = new RecordingEnvironment(
            1,
            3,
            [{ x: 1, y: 0 }],
            { x: 2, y: 0 },
            { x: 2, y: 0 },
            start,
        );
        const agent = new Agent(start);

        runWithRandomSequence(agent, environment, [0, 0, 0, 0]);

        assert.equal(environment.actionCount, 4);
        assert.equal(agent.getPhase(), "finished");
        assert.equal(agent.getTerminationReason(), "unreachable");
    });

    test("inspects the key room before taking the key", () => {
        const start = { x: 0, y: 0 };
        const exit = { x: 1, y: 0 };
        const environment = new RecordingEnvironment(1, 2, [], start, exit, start);

        runWithRandomSequence(new Agent(start), environment, [0.99]);

        const takeIndex = environment.events.findIndex((event) => event.type === "takeKey");
        assert.notEqual(takeIndex, -1);
        assert.deepEqual(environment.events[takeIndex - 1], { type: "inspect", position: start });
    });

    test("inspects the exit room before unlocking it", () => {
        const start = { x: 0, y: 0 };
        const exit = { x: 1, y: 0 };
        const environment = new RecordingEnvironment(1, 2, [], start, exit, start);

        runWithRandomSequence(new Agent(start), environment, [0.99]);

        const unlockIndex = environment.events.findIndex((event) => event.type === "unlockExit");
        assert.notEqual(unlockIndex, -1);
        assert.deepEqual(environment.events[unlockIndex - 1], { type: "inspect", position: exit });
    });

    test("changes its objective after collecting a key and returns to a previously discovered exit", () => {
        const start = { x: 0, y: 0 };
        const exit = { x: 1, y: 0 };
        const key = { x: 1, y: 1 };
        const environment = new RecordingEnvironment(2, 2, [], key, exit, start, 60);

        runWithSeed(new Agent(start), environment, 7);

        const firstExitInspection = environment.events.findIndex(
            (event) => event.type === "inspect" && event.position.x === exit.x && event.position.y === exit.y,
        );
        const keyTaken = environment.events.findIndex(
            (event) => event.type === "takeKey" && event.succeeded,
        );
        const exitUnlocked = environment.events.findIndex(
            (event) => event.type === "unlockExit" && event.succeeded,
        );

        assert.notEqual(firstExitInspection, -1);
        assert.notEqual(keyTaken, -1);
        assert.ok(firstExitInspection < keyTaken);
        assert.ok(keyTaken < exitUnlocked);
        assert.deepEqual(
            environment.events.slice(keyTaken + 1, exitUnlocked).filter(
                (event): event is Extract<RecordedEvent, { type: "move" }> =>
                    event.type === "move" && event.result.x !== -1 && event.result.y !== -1,
            ),
            [{ type: "move", direction: "up", result: exit }],
        );
        assert.equal(environment.events.at(-1)?.type, "exit");
    });

    test("never executes a 26th action when the goal cannot be reached", () => {
        const start = { x: 0, y: 0 };
        const unreachableKey = { x: 2, y: 2 };
        const environment = new RecordingEnvironment(
            3,
            3,
            [{ x: 1, y: 2 }, { x: 2, y: 1 }],
            unreachableKey,
            { x: 2, y: 2 },
            start,
            25,
        );

        assert.doesNotThrow(() => runWithSeed(new Agent(start), environment, 42));
        assert.ok(environment.actionCount <= 25);
        assert.equal(
            environment.events.some((event) => event.type === "exit" && event.succeeded),
            false,
        );
    });
});
