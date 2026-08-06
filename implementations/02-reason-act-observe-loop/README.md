# Exercise 2: Make the Reason-Act-Observe loop explicit

## Objective

Refactor the number-guessing program from Exercise 1 into an explicit
Reason-Act-Observe loop.

The program should solve the same problem with the same binary-search strategy.
The important change is the shape of the program: choosing an action, executing
it, observing its result, updating state, and deciding whether to stop must be
separate steps.

This is the bridge between an ordinary loop and a ReAct agent. Do not add an
LLM, tools, prompts, an agent framework, or a new problem environment yet.

## Starting point

Exercise 1 already contains the mechanics of a small agentic loop:

1. The current bounds are the loop's state.
2. Binary search chooses the next guess.
3. A guess affects the number-guessing environment.
4. The environment returns `too low`, `too high`, or `correct`.
5. The observation changes the state used by the next iteration.
6. Success or the attempt limit terminates the loop.

These responsibilities currently happen close together. In this exercise,
make their boundaries visible.

## The problem

Create a program that finds a hidden whole number between 1 and 100. On every
iteration, it must perform the following cycle:

1. **Reason:** inspect the current state and decide which guess to make next.
2. **Act:** submit that guess to the environment.
3. **Observe:** receive exactly one result: `too low`, `too high`, or `correct`.
4. **Update:** record the action and observation, then update the search bounds.
5. **Terminate or continue:** stop on success or after 10 actions; otherwise
   begin the next cycle with the updated state.

The strategy must remain deterministic binary search. Separating the stages
must not change the behavior that already works.

## Required concepts

### State

Keep one explicit state value containing everything that must persist between
iterations:

- the current lower and upper bounds;
- the number of actions already taken;
- the history of actions and observations;
- whether the task is still running, succeeded, or reached its safety limit.

The hidden number belongs to the environment. It must not be stored in the
agent's state or read by the reasoning step.

### Reason

The reasoning step receives the current state and returns one action: the next
guess. It must not compare the guess with the hidden number, modify the state,
or print output.

For this exercise, "reasoning" means applying the binary-search policy. It is a
small, inspectable decision rather than natural-language chain-of-thought.

### Action

Represent an action explicitly instead of passing around an unexplained number.
The action should state that the agent intends to guess a particular value.

There is only one action kind in this exercise: `guess`.

### Environment and observation

The environment owns the hidden number. It receives a guess action and returns
an observation. It must not choose the next guess or update the agent's state.

An observation contains one of these outcomes:

- `too low`;
- `too high`;
- `correct`.

### State update

The update step receives the previous state, the action, and the observation.
It records the interaction and produces the state for the next iteration.

- `too low` moves the lower bound above the previous guess.
- `too high` moves the upper bound below the previous guess.
- `correct` marks the task as successful.

### Termination

Termination is a decision made from state, not an early return hidden inside the
reasoning or environment steps. The loop stops for exactly one of two reasons:

1. the latest observation is `correct`;
2. 10 actions have been performed without success.

## Required trace

Print one structured trace entry per cycle containing:

- the iteration number;
- a short decision summary, such as the bounds used to choose the midpoint;
- the action;
- the observation;
- the updated bounds or final status.

After the loop, print the termination reason and the correct guess on success.
The trace should make it possible to reconstruct why each action followed from
the previous observation.

## Constraints

- Do not use randomness.
- Do not use an LLM or write an LLM prompt.
- Do not add external packages or an agent framework.
- Do not allow the reasoning step to access the hidden number.
- Do not combine reasoning and environment feedback into one operation.
- Do not execute more than 10 actions.
- Keep the exercise focused on control flow; one action kind is enough.

## Acceptance criteria

- Hidden numbers `1`, `50`, `73`, and `100` are found successfully.
- Every guess is between the current lower and upper bounds.
- Every non-initial guess can be explained by the preceding state and
  observations.
- The reasoning step depends only on agent state.
- The environment is the only component that can access the hidden number.
- Every action and observation is appended to history in order.
- A `correct` observation ends the loop immediately after the interaction is
  recorded.
- The safety limit prevents an eleventh action.
- The final trace clearly identifies the termination reason.
- Reasoning, action execution, state update, and termination can be tested
  independently.

## Tests to write

At minimum, verify that:

1. the four required hidden numbers are found within 10 actions;
2. reasoning selects the midpoint of the bounds in state;
3. each observation updates only the appropriate bound;
4. the environment returns the correct observation for low, high, and exact
   guesses;
5. history contains matching action-observation pairs in execution order;
6. success and the safety limit produce different terminal states;
7. no reasoning test needs access to a hidden number.

## Why this is the next step

Exercise 1 proves that a loop can choose, act on feedback, and terminate.
Exercise 2 turns those implicit responsibilities into interfaces. A future LLM
can then replace the deterministic reasoning policy without requiring the loop,
environment, history, or termination logic to be redesigned at the same time.

The conceptual transformation is:

| Exercise 1 | Exercise 2 | Later ReAct agent |
| --- | --- | --- |
| current bounds | explicit agent state | messages and working state |
| midpoint calculation | reasoning policy | model chooses the next action |
| numeric guess | typed action | tool call |
| number comparison | environment execution | tool execution |
| low/high/correct | observation | tool result |
| printed attempts | structured history | ReAct trajectory |
| success/10 guesses | explicit terminal state | answer/safety limits |

## Path from this exercise to a ReAct agent

Do not implement these stages now. They describe the intended direction of the
following exercises:

1. **Add multiple actions:** introduce a small environment in which the agent
   must choose between two or more allowed operations.
2. **Turn actions into tools:** give each action a name, validated input, an
   execution boundary, and a structured result.
3. **Make history model-ready:** represent prior actions and observations as an
   ordered context that a decision-maker can consume.
4. **Replace the fixed policy:** use an LLM to choose a permitted tool call from
   the current task and history.
5. **Add an answer action:** allow the model either to call another tool or
   return a final answer.
6. **Harden the harness:** validate tool calls and add iteration, error, timeout,
   and context limits.

At that point the outer loop remains recognizable:

`reason -> act -> observe -> update -> terminate or continue`

The ReAct agent is therefore not a completely different program. It is the
same control loop with a model-driven policy, real tools, richer observations,
and a stronger execution harness.

## Questions to answer after implementing it

1. Which data belongs to the agent, and which belongs to the environment?
2. Why should reasoning be unable to read the hidden number directly?
3. What makes an action different from an ordinary function argument?
4. Why must an observation be recorded before checking the next iteration?
5. Which component could later be replaced by an LLM with the fewest other
   changes?
6. What new failure modes appear when a deterministic policy is replaced by an
   LLM?
