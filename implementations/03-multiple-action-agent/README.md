# Choose between multiple actions

## Objective

Build an explicit Reason-Act-Observe loop in which the agent must choose between
more than one kind of action.

The agent must navigate a small, unknown maze, find a key, and unlock the exit.
It receives information only through observations returned after its actions.
The decision policy remains deterministic and hand-written.

This exercise introduces the problem that tool-using agents must solve: not
only deciding an action's input, but first deciding which action is appropriate.
Do not use an LLM, prompts, an agent framework, or external packages.

## Why multiple actions matter

The policy must choose between different capabilities:

- inspect the current room;
- move in a direction;
- take an item;
- unlock an exit.

Each action accepts different input and can produce different observations.
The outer loop remains the same:

`reason -> act -> observe -> update -> terminate or continue`

## The environment

Use this fixed 3-by-3 maze:

```text
          north

    +---------+---------+---------+
    | (0, 0)  | (1, 0)  | (2, 0)  |
    | start   |         | key     |
    +---------+---------+---------+
    | (0, 1)  | (1, 1)  | (2, 1)  |
    |         | blocked |         |
    +---------+---------+---------+
    | (0, 2)  | (1, 2)  | (2, 2)  |
    |         |         | exit    |
    +---------+---------+---------+

          south
```

Coordinates increase to the east and south. The agent begins at `(0, 0)`.
The room at `(1, 1)` is blocked. The key begins at `(2, 0)`, and the locked
exit is at `(2, 2)`.

The map is part of the environment. The agent must not receive the complete map
at startup. It learns about rooms, blocked moves, items, and the exit through
observations and records that knowledge in its own state.

## Goal

The task succeeds only when the agent:

1. reaches the key room;
2. inspects the room;
3. takes the key;
4. reaches the exit room;
5. inspects the room;
6. unlocks the exit with the key.

Reaching the exit without the key is not success. Standing in a room containing
an item does not automatically collect it.

## Available actions

Every action must have a distinct, explicit shape.

### Inspect

Inspects the agent's current room.

Input:

- no arguments.

Possible observation data:

- the current coordinates;
- available unblocked directions;
- whether the room contains a key;
- whether the room contains the exit and whether it is locked.

### Move

Attempts to move one room.

Input:

- one direction: `north`, `east`, `south`, or `west`.

Possible observations:

- movement succeeded and the new coordinates;
- movement failed because the boundary or a blocked room is in that direction.

Moving does not reveal every detail of the destination. The agent must inspect
the new room when it needs that information.

### Take

Attempts to take the key from the current room.

Input:

- the item name `key`.

Possible observations:

- the key was collected;
- the key is not present;
- the agent already has the key.

### Unlock

Attempts to unlock the exit in the current room.

Input:

- no arguments.

Possible observations:

- the exit was unlocked;
- there is no exit in the room;
- the exit is present, but the agent does not have the key.

## Agent state

Keep the agent's knowledge separate from the environment's true state. The
agent state should contain at least:

- its current known position;
- inspected rooms and what was observed in each;
- movements known to be blocked;
- whether it believes it has the key;
- the ordered action-observation history;
- the number of actions taken;
- the current run status.

The agent state must not contain unobserved parts of the maze.

The environment separately owns:

- the true maze layout;
- the agent's actual position;
- the key's actual location or collected status;
- the exit's actual locked status.

## Decision policy

Write down a deterministic policy before implementing it. The policy must
choose exactly one valid action from the current agent state.

It should follow these priorities:

1. Inspect a room that has not yet been inspected.
2. Take the key when an inspection reports it in the current room.
3. Unlock the exit when an inspection reports it and the agent has the key.
4. Move toward the key until it has been collected.
5. After collecting the key, move toward the exit.
6. Avoid moves already observed to be blocked.

The policy may use the known coordinates of the objective for this exercise,
but it may not read the environment's maze, key status, or exit status directly.

## Loop and termination

For every iteration:

1. Read the current agent state.
2. Choose one action using the deterministic policy.
3. Validate the action and its input.
4. Ask the environment to execute it.
5. Receive one structured observation.
6. Append the action-observation pair to history.
7. Update the agent's knowledge.
8. Check termination.

The loop stops for exactly one of these reasons:

- **Success:** the environment reports that the exit was unlocked.
- **Safety limit:** 25 actions have been executed without success.
- **No valid action:** the policy cannot find a permitted next action from the
  available knowledge.

## Required trace

Print one structured trace entry per iteration containing:

- the iteration number;
- a short decision summary based on known state;
- the selected action and its input;
- the observation returned by the environment;
- the relevant state change.

The final output must include the termination reason, total actions, final
position, whether the key was collected, and whether the exit was unlocked.

## Constraints

- Do not use an LLM or natural-language prompting.
- Do not let the policy access the environment directly.
- Do not reveal the full map through an observation.
- Do not change state before receiving the observation for an action.
- Do not automatically inspect, take, move, or unlock as a side effect of a
  different action.
- Do not execute invalid action inputs.
- Do not execute more than 25 actions.
- Keep the policy deterministic so its choices can be tested exactly.

## Acceptance criteria

- The agent collects the key and unlocks the exit.
- At least three distinct action kinds are used successfully.
- The agent inspects the key room before taking the key.
- The agent inspects the exit room before unlocking the exit.
- Attempting to move into `(1, 1)` returns a blocked observation and does not
  change the position.
- An unsuccessful action still appears in history.
- Every state change can be traced to an observation.
- The agent's knowledge never contains a room it has not observed.
- The policy chooses actions using agent state only.
- The environment validates actions against true environment state only.
- Success, the safety limit, and no-valid-action are distinct terminal states.
- Action selection, validation, execution, state update, and termination can be
  tested independently.

## Tests to design

At minimum, describe tests for:

1. inspecting the starting room;
2. a successful move;
3. a move into the blocked center room;
4. taking the key when present and when absent;
5. unlocking the exit with and without the key;
6. choosing `inspect` on entry to an unknown room;
7. changing the policy's objective after collecting the key;
8. preserving the order of action-observation history;
9. stopping immediately after unlocking the exit;
10. preventing a 26th action.

## Work through it on paper first

Before writing code, create two separate tables.

### Environment table

Track the truth that only the environment knows:

| Step | Actual position | Key location/status | Exit status |
| --- | --- | --- | --- |
| 0 | `(0, 0)` | at `(2, 0)` | locked |

### Agent trace

Track only information available to the agent:

| Step | Known position | Decision summary | Action | Observation | Knowledge gained | Inventory |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | `(0, 0)` | Current room is unknown | `inspect` | ? | ? | empty |

Complete the agent trace until the exit is unlocked. After every row, check:

1. Could the agent choose this action from its recorded knowledge alone?
2. Did the environment return only information caused by that action?
3. Did the agent update its knowledge only after receiving the observation?
4. Is the complete action-observation pair present in history?
5. Should the loop stop now?

Then trace these failure cases separately:

- moving east from `(0, 1)` into the blocked center;
- taking the key in the starting room;
- unlocking the exit before collecting the key;
- reaching the 25-action safety limit.

## Connection to a ReAct agent

This exercise adds the first real action-selection problem. The policy now
produces a discriminated action rather than only a numeric parameter. Each
action behaves like a future tool call:

| This exercise | Later ReAct agent |
| --- | --- |
| deterministic policy | LLM decision |
| action kind | tool name |
| action input | tool arguments |
| action validation | tool-call schema validation |
| environment execution | tool execution |
| structured observation | tool result |
| agent history | model context |

The next step should turn these action handlers into a generic tool interface
and registry. The loop should be able to validate and dispatch an action by
name without containing a separate branch for every capability. Only after
that boundary is stable should a later exercise replace the deterministic
policy with an LLM.

## Questions to answer after solving it

1. Why must agent knowledge and environment truth be different state values?
2. What information is required to validate an action before executing it?
3. Should failed actions be recorded in history? Why?
4. How does the policy decide which action kind to use next?
5. Which bugs appear if movement also inspects or collects automatically?
6. What should happen when the policy returns an unknown action kind?
7. Which parts of the loop are independent of this particular maze?
8. What would need to change to expose the actions as tools to an LLM?
