# Exercise 5: Maze agent with conversation history

## Purpose

Extend the LLM maze agent from solution 04 so the model can use a structured
conversation history of its previous actions and verified environment results.

This mirrors an important property of coding agents: the model works from a
stable instruction, a current task state, and the accumulating record of tool
calls and tool outputs.

The experiment is not to give the model more authority. The execution harness
must continue to own validation, environment execution, state updates, limits,
and success criteria.

## Current baseline

Solution 04 gives the model a per-turn summary of verified knowledge:

- current position and current observation;
- a path tree of successful traversals;
- known blocked nodes;
- key and exit status; and
- the discovered exit location.

This is a compact world model. It retains durable facts but not the order in
which actions occurred. For example, it does not directly express that the
model tried the same action twice recently or that a key action failed at the
current location.

## Proposed design

Keep three distinct values for each run:

```text
System prompt
  Stable instructions: goal, permitted actions, and safety rules.

AgentState
  Authoritative verified knowledge owned by the application.

ConversationHistory
  Model-facing transcript of action requests and verified tool results.
```

`AgentState` remains the source of truth. Conversation history is context for
the model, never evidence that an action succeeded.

Each turn should follow this sequence:

1. Send the stable system prompt, the accumulated history, and current
   verified state to the model.
2. Validate the model's requested action.
3. Execute only a valid action in the environment.
4. Update `AgentState` from the environment result.
5. Append the requested action and verified result to `ConversationHistory`.
6. Stop immediately when the verified harness reaches a terminal condition.

## Conversation entries

Store structured data rather than an unstructured transcript. A possible
shape is:

```ts
type ConversationEntry =
    | { role: "user"; content: { verifiedState: PlanningState } }
    | { role: "assistant"; content: Action }
    | { role: "tool"; content: ActionResult };
```

The assistant entry records the action the model selected. The tool entry
records the actual, validated environment result, including unsuccessful
actions. If the model returns an invalid action, record the validation result
without allowing it to change `AgentState`.

Do not store hidden environment state or private chain-of-thought in the
history.

## History strategy

Compare three approaches against the same repeatable maze configurations:

| Strategy | Model context |
| --- | --- |
| Summary only | Current verified state, path tree, and blocked nodes; this is the solution 04 baseline. |
| Full history | System prompt plus every action and verified result from the current run. |
| Bounded history | System prompt, current verified state, and only the most recent 10–20 transcript entries. |

The likely practical choice is bounded history plus the existing summary. The
summary retains durable facts while recent entries help the model avoid local
loops and understand its immediate plan without allowing prompt size to grow
without limit.

## Evaluation

Run each strategy across identical solvable and unsolvable maze scenarios.
Record at least:

- success rate and termination reason;
- environment action count;
- repeated failed or repeated no-progress actions;
- invalid action count;
- model latency;
- input and output tokens; and
- estimated cost.

Keep the model, model settings, maze configuration, action limit, and number
of runs consistent while comparing strategies. Report both aggregate results
and individual trajectories so unexpected behavior can be inspected.

## Acceptance criteria

- The system prompt remains stable for the run.
- The model receives a transcript of prior selected actions and verified tool
  results.
- Only environment results update `AgentState`.
- Every transcript entry is attributable to one model request or one verified
  harness result.
- Invalid actions cannot change the environment or verified state.
- The history is bounded or otherwise controlled to enforce a context budget.
- Existing action, time, token, and cost limits remain enforced.
- Summary-only, full-history, and bounded-history runs can be compared from
  recorded metrics.

## Suggested first milestone

Implement a local `ConversationHistory` object without changing the maze
environment. Add entries after every model request and environment result,
then write unit tests showing that the model receives only verified history.
After that, run the three planned strategies and compare their trajectories.
