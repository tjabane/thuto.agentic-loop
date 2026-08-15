import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { makeCellKey } from "./maze-utils.js";
import { TraversalRoutePlanner } from "./route-planner.js";
import type { Direction, Position, TraversalNode } from "./types.js";

const ALL_DIRECTIONS: Direction[] = ["up", "down", "left", "right"];

function createNode(
    position: Position,
    neighbours: TraversalNode["neighbours"],
    attemptedDirections: Direction[] = ALL_DIRECTIONS,
): TraversalNode {
    return {
        position,
        neighbours,
        attemptedDirections: new Set(attemptedDirections),
        blockedDirections: new Set(),
        isExit: false,
    };
}

function createTraversalMap(): Map<string, TraversalNode> {
    const positions = {
        start: { x: 0, y: 0 },
        shortMiddle: { x: 1, y: 0 },
        destination: { x: 2, y: 0 },
        longOne: { x: 0, y: 1 },
        longTwo: { x: 1, y: 1 },
        longThree: { x: 2, y: 1 },
    };
    const nodes = [
        createNode(positions.start, { right: positions.shortMiddle, down: positions.longOne }),
        createNode(positions.shortMiddle, { left: positions.start, right: positions.destination }),
        createNode(positions.destination, { left: positions.shortMiddle, down: positions.longThree }),
        createNode(positions.longOne, { up: positions.start, right: positions.longTwo }),
        createNode(positions.longTwo, { left: positions.longOne, right: positions.longThree }),
        createNode(positions.longThree, { left: positions.longTwo, up: positions.destination }),
    ];
    return new Map(nodes.map(node => [makeCellKey(node.position), node]));
}

describe("TraversalRoutePlanner", () => {
    test("returns the shortest route to a known destination", () => {
        const planner = new TraversalRoutePlanner();
        const traversalMap = createTraversalMap();

        assert.deepEqual(
            planner.findRouteToPosition(traversalMap, { x: 0, y: 0 }, { x: 2, y: 0 }),
            ["right", "right"],
        );
    });

    test("routes to the nearest node with an untried direction", () => {
        const planner = new TraversalRoutePlanner();
        const traversalMap = createTraversalMap();
        const nearestNode = traversalMap.get(makeCellKey({ x: 1, y: 0 }));
        nearestNode?.attemptedDirections.delete("up");

        assert.deepEqual(
            planner.findRouteToNearestExplorableNode(traversalMap, { x: 0, y: 0 }),
            ["right"],
        );
    });

    test("returns undefined when no matching node is reachable", () => {
        const planner = new TraversalRoutePlanner();
        const isolatedStart = createNode({ x: 0, y: 0 }, {});
        const traversalMap = new Map([[makeCellKey(isolatedStart.position), isolatedStart]]);

        assert.equal(
            planner.findRouteToPosition(traversalMap, isolatedStart.position, { x: 1, y: 0 }),
            undefined,
        );
        assert.equal(
            planner.findRouteToNearestExplorableNode(traversalMap, isolatedStart.position),
            undefined,
        );
    });
});
