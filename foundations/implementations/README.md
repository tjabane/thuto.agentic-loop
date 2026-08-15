# Foundation implementation roadmap

This roadmap builds an agentic control loop from first principles. It begins
with deterministic behavior, turns actions into validated tools, and finally
introduces an LLM without giving the model ownership of execution or safety.

Every exercise should preserve a structured trajectory containing the state,
decision summary, action, observation, state update, and termination status.
This makes deterministic and LLM-driven policies directly comparable.

## Exercise 1: Explicit Reason-Act-Observe loop

Build a deterministic agent that navigates a small, partially observed maze,
finds a key, and unlocks an exit.

Separate these responsibilities:

- agent state and environment state;
- decision policy;
- typed actions;
- environment execution;
- structured observations;
- state updates and history;
- success, failure, and safety-limit termination.

The point is not pathfinding sophistication. The maze is a small environment in
which actions have visible consequences and the policy cannot read hidden
environment state.

Use the existing
[multiple-action maze specification](./03-multiple-action-agent/support/README.md) as
the starting point.

## Exercise 2: Tool interface and dispatcher

Turn the maze actions into named tools with input schemas, validation,
structured results, and a generic dispatcher. The loop must dispatch an action
without containing a separate branch for every tool.

Keep the deterministic policy so the tool harness can be tested independently
of an LLM. Add explicit results for:

- an unknown tool;
- invalid arguments;
- an execution failure;
- an action that is valid but unsuccessful.

## Exercise 3: Minimal LLM ReAct agent

Replace only the deterministic decision policy with an LLM. On each turn, the
model must choose one validated tool call or return a final result. Preserve the
existing state, history, execution, and termination boundaries.

The harness, not the model, owns:

- tool validation and execution;
- iteration, time, and token limits;
- state transitions;
- trajectory recording;
- success and failure criteria.

Run the deterministic and LLM policies against the same maze scenarios.
Compare success rate, action count, invalid calls, latency, and cost.

## Completion boundary

The project ends after the LLM and deterministic policies have been compared
using the same safe, observable harness. Repository inspection and editing are
part of the separate
[`basic-coding-agent`](../../basic-coding-agent/README.md) project. Interactive
mathematics and physics work belongs in `agent.strang`.

The continuing thread is:

```text
reason -> act -> observe -> update -> terminate or continue
```
