# Blind exploration and exploitation plan

The agent must learn the maze only from cell observations and movement results. It does not know the maze dimensions, boundaries, walls, key location, or exit location at startup.

## Strategy

1. Represent discovered space as a traversal graph. Each visited position is a node containing successful neighbouring connections, attempted directions, blocked directions, and observed features such as the exit.
2. After every movement attempt, record the attempted direction. A successful move creates a connection in both directions; a failed move records a blocked direction on the source node.
3. Track an explicit agent phase: `explore`, `exploit`, or `finished`.
4. Always remember the exit when it is observed, including when the agent already carries the key. Switch to `exploit` once the key is held and the exit is known.
5. During exploration, first attempt an untried direction from the current node. If none exists, find the closest known node that still has an untried direction.
6. Use breadth-first search over the traversal graph to calculate routes both to an explorable node and to the exit.
7. Store and execute a planned route instead of randomly moving across already-known cells.
8. If no reachable node has an untried direction and the objective remains incomplete, terminate with an explicit unreachable result.

## Implementation status

Items 1–8 are implemented. Exploration attempts unknown local edges first, then uses breadth-first search to reach the closest node with remaining unknown edges. Exploitation uses breadth-first search to follow the shortest known route to the observed exit. Exhausted and safety-limited runs terminate with explicit reasons.

Route calculation is owned by `TraversalRoutePlanner`. The agent owns observations, phase transitions, planned-route execution, and actions, while the planner owns untried-direction queries, breadth-first search, and route reconstruction over the learned graph.

## Invariants

- Graph knowledge comes only from observations and movement outcomes.
- A successful connection is recorded on both endpoint nodes.
- A failed direction is never represented as a traversable edge.
- The agent enters `exploit` only when it has collected the key and observed the exit.
- Backtracking through known nodes will eventually be deliberate route execution, not random exploration.
