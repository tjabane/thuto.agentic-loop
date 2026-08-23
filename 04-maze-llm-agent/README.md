# LLM maze exploration agent

## Problem statement

Build an agent that uses a large language model to decide how to explore an
unknown maze, collect a key, unlock the exit, and leave the maze.

The agent begins with only its starting position. It must learn the maze through
the results of its own actions. The complete maze layout, blocked cells, key
location, and exit location are private environment state and must not be
revealed to the model in advance.

The challenge is to determine whether an LLM can make reliable, valid, and
efficient action choices from partial observations while remaining within
strict execution and safety limits.

## Objective

A run succeeds when the agent:

1. explores the maze through permitted actions;
2. finds and collects the key;
3. finds the exit;
4. unlocks the exit while carrying the key; and
5. exits the maze.

Reaching the exit without the key, standing on the key without collecting it,
or unlocking the exit without leaving the maze does not complete the task.

## Environment

The environment is a rectangular grid containing:

- one starting position;
- zero or more blocked cells;
- one key;
- one locked exit; and
- one agent position.

Coordinates increase from left to right on the x-axis and from top to bottom on
the y-axis. The environment owns the true state of the maze and validates every
attempted action against that state.

Test runs must include multiple maze configurations. A configuration may be
solvable or may contain an unreachable objective.

## Information available to the model

The model may receive only information that the agent has legitimately learned,
including:

- its current known position;
- observations of cells it has inspected;
- results of successful and unsuccessful movement attempts;
- whether it has collected the key;
- whether a discovered exit is locked or unlocked;
- its previous actions and their results; and
- the remaining run limits.

The model must not receive the environment's full grid, undiscovered blocked
cells, undiscovered item locations, or future action results.

## Permitted actions

The agent can request the following actions:

- inspect its current cell;
- move one cell up, down, left, or right;
- collect the key from its current cell;
- unlock the exit at its current cell; and
- exit from its current cell.

Each request must identify exactly one supported action and provide all required
inputs. Unsupported actions, missing inputs, extra inputs, and invalid direction
values are invalid requests.

## Required behavior

The system must:

- ask the model to choose actions using only the agent's available knowledge;
- validate every model-produced action before it can affect the environment;
- record successful, unsuccessful, and invalid action attempts;
- update agent knowledge only from action results;
- distinguish model output from verified environment observations;
- prevent an invalid model response from directly changing state;
- stop immediately after a terminal outcome; and
- produce a complete, inspectable record of each run.

The model may revisit known cells or revise its plan as new information becomes
available. It must not claim success unless the environment reports that the
success conditions have been met.

## Run limits and termination

Every run must have explicit limits for:

- environment actions;
- model requests;
- elapsed time; and
- model token usage or cost.

A run ends with exactly one recorded termination reason:

- **success**: the agent exits through the unlocked exit;
- **unreachable**: no permitted route to the remaining objective can be found;
- **action limit**: the maximum number of environment actions is reached;
- **model limit**: a model request, token, time, or cost limit is reached;
- **invalid response**: the model repeatedly fails to produce a valid action;
- **model failure**: the model cannot be reached or returns an unrecoverable
  error; or
- **environment failure**: the environment cannot execute or report an action
  reliably.

No environment action may execute after a limit or terminal condition has been
reached.

## Run record

For every decision, the run record must contain enough information to determine:

- what the agent knew before the decision;
- what information was presented to the model;
- what response the model produced;
- whether the response was valid;
- what action, if any, was executed;
- what the environment reported;
- how the agent's knowledge changed; and
- which limits remained after the step.

The final record must include the termination reason, final position, key and
exit status, action count, model-request count, elapsed time, token usage, and
cost when available.

Secrets, credentials, and sensitive provider metadata must not appear in the
run record.

## Evaluation scenarios

The agent must be evaluated against at least these cases:

1. the key and exit are in the starting cell;
2. the key is encountered before the exit;
3. the exit is encountered before the key;
4. a direct route is blocked but an alternative route exists;
5. an attempted movement crosses the maze boundary;
6. the key is unreachable;
7. the exit is unreachable after collecting the key;
8. the model requests an unsupported action;
9. the model supplies malformed action input;
10. the model repeats an action that previously failed;
11. the model service fails during a run; and
12. a configured run limit is reached.

The same maze configuration must be repeatable so results can be compared
across models, model settings, and repeated runs.

## Acceptance criteria

The problem is satisfied when:

- the LLM is responsible for selecting the next requested action;
- hidden environment state never appears in model input before it is observed;
- only valid actions can change environment state;
- the recorded trajectory accounts for every state change;
- success is based on verified environment state rather than a model claim;
- every run terminates with one explicit reason;
- configured safety and resource limits are enforced;
- solvable and unsolvable mazes are both handled without uncontrolled looping;
- runs can be reproduced from their maze configuration and recorded inputs; and
- results can be compared using success, validity, efficiency, latency, token,
  and cost measurements.

## Non-goals

This problem does not require:

- generating mazes with an LLM;
- giving the model direct access to environment state;
- allowing the model to execute arbitrary code or commands;
- training or fine-tuning a model;
- optimizing for a particular model provider; or
- modifying the existing deterministic maze exploration agent.

## Live LLM scenario tests

The live scenario suite uses the configured OpenAI model and makes billable API
requests. It is disabled during normal test runs. To enable it in PowerShell:

```powershell
$env:OPENAI_API_KEY="your-api-key"
$env:OPENAI_MODEL="gpt-5.6-luna"
$env:RUN_LIVE_LLM_TESTS="true"
$env:LLM_E2E_MAX_ACTIONS="25"
npm run test:llm:live
```

The suite runs sequentially and covers a shared key/exit starting node, key-first
and exit-first exploration, an alternate route around a blocked node, and an
unreachable key or exit. Lower `LLM_E2E_MAX_ACTIONS` to reduce the maximum
number of API requests per scenario.
