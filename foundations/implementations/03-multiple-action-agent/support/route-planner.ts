import { makeCellKey } from "./maze-utils.js";
import type { Direction, Position, TraversalNode } from "./types.js";

const DIRECTIONS: readonly Direction[] = ["up", "down", "left", "right"];

class TraversalRoutePlanner {
    public getUntriedDirections(node: TraversalNode): Direction[] {
        return DIRECTIONS.filter(direction => !node.attemptedDirections.has(direction));
    }

    public findRouteToNearestExplorableNode(
        traversalMap: ReadonlyMap<string, TraversalNode>,
        start: Position,
    ): Direction[] | undefined {
        return this.findShortestRoute(
            traversalMap,
            start,
            node => this.getUntriedDirections(node).length > 0,
        );
    }

    public findRouteToPosition(
        traversalMap: ReadonlyMap<string, TraversalNode>,
        start: Position,
        destination: Position,
    ): Direction[] | undefined {
        const destinationKey = makeCellKey(destination);
        if (makeCellKey(start) === destinationKey) {
            return [];
        }
        return this.findShortestRoute(
            traversalMap,
            start,
            node => makeCellKey(node.position) === destinationKey,
        );
    }

    private findShortestRoute(
        traversalMap: ReadonlyMap<string, TraversalNode>,
        start: Position,
        isGoal: (node: TraversalNode) => boolean,
    ): Direction[] | undefined {
        const startKey = makeCellKey(start);
        const queue: Position[] = [{ ...start }];
        const visited = new Set<string>([startKey]);
        const previous = new Map<string, { position: Position; direction: Direction }>();

        while (queue.length > 0) {
            const current = queue.shift();
            if (!current) {
                break;
            }
            const currentKey = makeCellKey(current);
            const currentNode = traversalMap.get(currentKey);
            if (!currentNode) {
                continue;
            }
            if (currentKey !== startKey && isGoal(currentNode)) {
                return this.reconstructRoute(startKey, currentKey, previous);
            }

            for (const direction of DIRECTIONS) {
                const neighbour = currentNode.neighbours[direction];
                if (!neighbour) {
                    continue;
                }
                const neighbourKey = makeCellKey(neighbour);
                if (visited.has(neighbourKey)) {
                    continue;
                }
                visited.add(neighbourKey);
                previous.set(neighbourKey, { position: current, direction });
                queue.push(neighbour);
            }
        }

        return undefined;
    }

    private reconstructRoute(
        startKey: string,
        goalKey: string,
        previous: ReadonlyMap<string, { position: Position; direction: Direction }>,
    ): Direction[] {
        const route: Direction[] = [];
        let currentKey = goalKey;

        while (currentKey !== startKey) {
            const step = previous.get(currentKey);
            if (!step) {
                return [];
            }
            route.unshift(step.direction);
            currentKey = makeCellKey(step.position);
        }
        return route;
    }
}

export { TraversalRoutePlanner };
