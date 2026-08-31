import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { Agent } from "../../src/agent.js";
import type {
    Action,
    DecisionClient,
} from "../../src/decision-client/decision-client-contracts.js";
import { Enviroment } from "../../src/enviroment.js";
import { GetStateTool } from "../../src/tools/environment/get-state-tool.js";
import { InspectCurrentNodeTool } from "../../src/tools/environment/inspect-current-node-tool.js";
import { MoveTool } from "../../src/tools/environment/move-tool.js";
import { TakeKeyTool } from "../../src/tools/environment/take-key-tool.js";
import { UnlockExitTool } from "../../src/tools/environment/unlock-exit-tool.js";
import type { Tool, ToolResult } from "../../src/tools/tool-contracts.js";

type Position = { readonly x: number; readonly y: number };
type Direction = "down" | "left" | "right" | "up";

const DIRECTIONS: readonly Direction[] = ["up", "down", "left", "right"];

class SequenceDecisionClient implements DecisionClient {
    public readonly contexts: ToolResult[][] = [];
    public readonly availableTools: string[][] = [];

    constructor(private readonly actions: readonly Action[]) {}

    public async decide(
        context: readonly ToolResult[],
        tools: readonly Tool[],
    ): Promise<Action | undefined> {
        this.contexts.push([...context]);
        this.availableTools.push(tools.map(tool => tool.name));
        return this.actions[this.contexts.length - 1];
    }
}

function createTools(enviroment: Enviroment): Tool[] {
    return [
        new MoveTool(enviroment),
        new TakeKeyTool(enviroment),
        new UnlockExitTool(enviroment),
        new GetStateTool(enviroment),
        new InspectCurrentNodeTool(enviroment),
    ];
}

function createCountingTool(onExecute: () => void): Tool {
    return {
        name: "count",
        description: "Count one execution.",
        inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
        },
        async execute() {
            onExecute();
            return { success: true, message: "Counted." };
        },
    };
}

function action(name: string, parameters: unknown = {}): Action {
    return { id: crypto.randomUUID(), name, parameters };
}

describe("Agent maze scenarios", () => {
    test("collects the key, reaches the exit, and unlocks it", async () => {
        const enviroment = new Enviroment(2, { x: 1, y: 0 }, { x: 1, y: 1 }, new Set());
        const decisionClient = new SequenceDecisionClient([
            action("move", { direction: "right" }),
            action("take_key"),
            action("move", { direction: "down" }),
            action("unlock_exit"),
        ]);

        await new Agent(createTools(enviroment), decisionClient).run();

        assert.deepEqual(enviroment.getState(), {
            keyPosition: { x: 1, y: 0 },
            existPosition: { x: 1, y: 1 },
            agentPostion: { x: 1, y: 1 },
            isKeyTaken: true,
            isExistLocked: false,
        });
        assert.equal(decisionClient.contexts.length, 5);
        assert.deepEqual(decisionClient.contexts.at(-1), [
            { success: true, message: "Agent moved successfully.", data: { direction: "right", position: { x: 1, y: 0 } } },
            { success: true, message: "Key collected." },
            { success: true, message: "Agent moved successfully.", data: { direction: "down", position: { x: 1, y: 1 } } },
            { success: true, message: "Exit unlocked." },
        ]);
    });

    test("returns a blocked move to the decision client and allows replanning", async () => {
        const enviroment = new Enviroment(
            2,
            { x: 1, y: 1 },
            { x: 1, y: 1 },
            new Set([{ x: 1, y: 0 }]),
        );
        const decisionClient = new SequenceDecisionClient([
            action("move", { direction: "right" }),
            action("move", { direction: "down" }),
        ]);

        await new Agent(createTools(enviroment), decisionClient).run();

        assert.deepEqual(enviroment.getState().agentPostion, { x: 0, y: 1 });
        assert.deepEqual(decisionClient.contexts[1], [
            {
                success: false,
                message: "Agent could not move in that direction.",
                data: { direction: "right", position: { x: 0, y: 0 } },
            },
        ]);
        assert.equal(decisionClient.contexts[2]?.[1]?.success, true);
    });

    test("returns rejected tool input to the decision client without changing the maze", async () => {
        const enviroment = new Enviroment(2, { x: 1, y: 0 }, { x: 1, y: 1 }, new Set());
        const decisionClient = new SequenceDecisionClient([
            action("move", { direction: "diagonal" }),
            action("inspect_current_node"),
        ]);

        await new Agent(createTools(enviroment), decisionClient).run();

        assert.deepEqual(enviroment.getState().agentPostion, { x: 0, y: 0 });
        assert.deepEqual(decisionClient.contexts[1], [
            { success: false, message: "Move requires exactly one valid direction." },
        ]);
        assert.deepEqual(decisionClient.contexts.at(-1)?.[1], {
            success: true,
            message: "Current node inspected.",
            data: {
                position: { x: 0, y: 0 },
                hasKey: false,
                hasExit: false,
                isExitLocked: true,
            },
        });
    });

    test("records an unavailable tool request and continues safely", async () => {
        const enviroment = new Enviroment(2, { x: 1, y: 0 }, { x: 1, y: 1 }, new Set());
        const decisionClient = new SequenceDecisionClient([
            action("teleport", { x: 1, y: 1 }),
            action("get_state"),
        ]);

        await new Agent(createTools(enviroment), decisionClient).run();

        assert.deepEqual(enviroment.getState().agentPostion, { x: 0, y: 0 });
        assert.deepEqual(decisionClient.contexts[1], [
            { success: false, message: 'Requested tool "teleport" is unavailable.' },
        ]);
        assert.deepEqual(decisionClient.availableTools[0], [
            "move",
            "take_key",
            "unlock_exit",
            "get_state",
            "inspect_current_node",
        ]);
    });

    test("stops after the default twenty-five tool attempts", async () => {
        let executions = 0;
        const decisionClient = new SequenceDecisionClient(
            Array.from({ length: 30 }, () => action("count")),
        );

        await new Agent([createCountingTool(() => (executions += 1))], decisionClient).run();

        assert.equal(executions, 25);
        assert.equal(decisionClient.contexts.length, 25);
    });

    test("uses a caller-supplied attempt limit", async () => {
        let executions = 0;
        const decisionClient = new SequenceDecisionClient(
            Array.from({ length: 3 }, () => action("count")),
        );

        await new Agent([createCountingTool(() => (executions += 1))], decisionClient).run(2);

        assert.equal(executions, 2);
        assert.equal(decisionClient.contexts.length, 2);
    });

    test("solves multiple seeded random maze configurations", async () => {
        const random = createSeededRandom(12345);

        for (let scenario = 0; scenario < 20; scenario += 1) {
            const maze = createSolvableMaze(random);
            const actions = [
                ...pathActions(maze.pathToKey),
                action("take_key"),
                ...pathActions(maze.pathToExit),
                action("unlock_exit"),
            ];
            const enviroment = new Enviroment(
                maze.size,
                maze.keyPosition,
                maze.exitPosition,
                maze.blockedNodes,
            );

            await new Agent(createTools(enviroment), new SequenceDecisionClient(actions)).run();

            assert.deepEqual(
                enviroment.getState(),
                {
                    keyPosition: maze.keyPosition,
                    existPosition: maze.exitPosition,
                    agentPostion: maze.exitPosition,
                    isKeyTaken: true,
                    isExistLocked: false,
                },
                `scenario ${scenario} should solve its generated maze`,
            );
        }
    });
});

function createSolvableMaze(random: () => number): {
    readonly size: number;
    readonly keyPosition: Position;
    readonly exitPosition: Position;
    readonly blockedNodes: Set<Position>;
    readonly pathToKey: readonly Direction[];
    readonly pathToExit: readonly Direction[];
} {
    const size = 4;
    const start = { x: 0, y: 0 };

    for (let attempt = 0; attempt < 100; attempt += 1) {
        const keyPosition = randomPosition(size, random);
        const exitPosition = randomPosition(size, random);
        if (positionsMatch(keyPosition, start) || positionsMatch(keyPosition, exitPosition)) {
            continue;
        }

        const blockedNodes = new Set<Position>();
        for (const position of allPositions(size)) {
            if (
                !positionsMatch(position, start) &&
                !positionsMatch(position, keyPosition) &&
                !positionsMatch(position, exitPosition) &&
                random() < 0.2
            ) {
                blockedNodes.add(position);
            }
        }

        const pathToKey = findPath(start, keyPosition, size, blockedNodes);
        const pathToExit = findPath(keyPosition, exitPosition, size, blockedNodes);
        if (pathToKey !== undefined && pathToExit !== undefined) {
            return { size, keyPosition, exitPosition, blockedNodes, pathToKey, pathToExit };
        }
    }

    throw new Error("Could not create a solvable maze from the seeded random sequence.");
}

function pathActions(path: readonly Direction[]): Action[] {
    return path.map(direction => action("move", { direction }));
}

function findPath(
    start: Position,
    target: Position,
    size: number,
    blockedNodes: ReadonlySet<Position>,
): Direction[] | undefined {
    const queue: Array<{ position: Position; path: Direction[] }> = [{ position: start, path: [] }];
    const visited = new Set([positionKey(start)]);

    while (queue.length > 0) {
        const current = queue.shift();
        if (current === undefined) {
            return undefined;
        }
        if (positionsMatch(current.position, target)) {
            return current.path;
        }

        for (const direction of DIRECTIONS) {
            const nextPosition = move(current.position, direction);
            if (
                !isInBounds(nextPosition, size) ||
                containsPosition(blockedNodes, nextPosition) ||
                visited.has(positionKey(nextPosition))
            ) {
                continue;
            }

            visited.add(positionKey(nextPosition));
            queue.push({ position: nextPosition, path: [...current.path, direction] });
        }
    }

    return undefined;
}

function allPositions(size: number): Position[] {
    const positions: Position[] = [];
    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            positions.push({ x, y });
        }
    }
    return positions;
}

function randomPosition(size: number, random: () => number): Position {
    return { x: Math.floor(random() * size), y: Math.floor(random() * size) };
}

function move(position: Position, direction: Direction): Position {
    const offsets: Record<Direction, Position> = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 },
    };
    const offset = offsets[direction];
    return { x: position.x + offset.x, y: position.y + offset.y };
}

function containsPosition(positions: ReadonlySet<Position>, target: Position): boolean {
    return [...positions].some(position => positionsMatch(position, target));
}

function isInBounds(position: Position, size: number): boolean {
    return position.x >= 0 && position.x < size && position.y >= 0 && position.y < size;
}

function positionKey(position: Position): string {
    return `${position.x},${position.y}`;
}

function positionsMatch(left: Position, right: Position): boolean {
    return left.x === right.x && left.y === right.y;
}

function createSeededRandom(seed: number): () => number {
    let state = seed;
    return () => {
        state = (state * 1664525 + 1013904223) % 2 ** 32;
        return state / 2 ** 32;
    };
}
