# Implementation roadmap

This roadmap builds agentic systems from first principles. It begins with a
small deterministic loop, turns actions into tools, introduces an LLM, and then
uses the same harness to build a basic coding agent.

ReAct is the first usable architecture, not the final destination. Later
exercises add verification, visual world construction, memory, planning, and
controlled self-improvement.

Research agents are deliberately not part of the main path. The two main
applications are:

1. a basic coding agent that can inspect, modify, and verify a repository;
2. an agent that creates interactive visual explanations of mathematics and
   physics.

Every exercise should preserve a structured trajectory containing the state,
decision summary, action, observation, state update, and termination status.
This makes deterministic and LLM-driven policies directly comparable.

## Phase 1: Learn the loop without an LLM

### Exercise 1: Explicit Reason-Act-Observe loop

Build a deterministic agent that navigates a small, partially observed maze,
finds a key, and unlocks an exit.

Separate the following responsibilities:

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

Use the existing [multiple-action maze specification](./03-multiple-action-agent/README.md)
as the starting point.

### Exercise 2: Tool interface and dispatcher

Turn the maze actions into named tools with input schemas, validation,
structured results, and a generic dispatcher. The loop must dispatch an action
without containing a separate branch for every tool.

Keep the deterministic policy so the tool harness can be tested independently
of an LLM.

Add explicit results for:

- an unknown tool;
- invalid arguments;
- an execution failure;
- an action that is valid but unsuccessful.

### Exercise 3: Minimal LLM ReAct agent

Replace only the deterministic decision policy with an LLM. On each turn, the
model must choose one validated tool call or return a final result. Preserve the
existing state, history, execution, and termination boundaries.

The harness, not the model, owns:

- tool validation and execution;
- iteration, time, and token limits;
- state transitions;
- trajectory recording;
- success and failure criteria.

Run the deterministic and LLM policies against the same maze scenarios. Compare
success rate, action count, invalid calls, latency, and cost.

This is the first LLM-based agent.

## Phase 2: Build a basic coding agent

### Exercise 4: Read-only repository agent

Give the ReAct agent a small, bounded set of repository tools:

- list files;
- search text;
- read a file or selected lines;
- inspect project metadata;
- return a final answer with file references.

The agent answers questions about a repository but cannot modify it. Restrict
all paths to a temporary fixture repository and prevent path traversal.

Example task:

> Find where request timeouts are configured and explain which tests cover the
> behavior.

This exercise introduces repository exploration, evidence gathering, context
selection, and grounded final answers without the risk of code modification.

### Exercise 5: Test-guided coding agent

Add tools for applying a patch and running a small allowlisted set of checks.
The agent receives a focused bug report, inspects the repository, edits the
code, and verifies the result.

The basic loop is:

```text
inspect
-> form a bounded hypothesis
-> edit
-> run the relevant check
-> observe the result
-> revise or finish
```

Use fixture repositories with known defects and deterministic tests. Keep edits
inside the fixture workspace and record every patch and command result in the
trajectory.

Success requires both a passing check and a final diff that stays within the
task scope. A model claiming that the task is complete is not sufficient.

### Exercise 6: Hardened coding-agent harness

Introduce the failure modes that appear when an LLM controls real tools:

- malformed or repeated tool calls;
- invalid paths and arguments;
- tool exceptions and timeouts;
- commands outside the allowlist;
- edits outside the workspace;
- excessive or unrelated diffs;
- repeated failures with no measurable progress;
- growing history and context limits;
- iteration, token, time, and cost budgets.

Add loop-level controls for validation, cancellation, repeat detection, bounded
retries, context compaction, and distinct terminal states. Destructive or
external actions must require a separate approval boundary.

### Exercise 7: Verified coding agent

Require the agent to select and run proportional verification such as focused
tests, linting, type checking, or a build. Keep verification policy outside the
model and do not allow the agent to weaken tests merely to make them pass.

Before success, inspect:

- the final diff;
- relevant test results;
- unexpected changed files;
- unresolved errors;
- whether the original acceptance criteria were actually demonstrated.

Detect repeated failures and stop when revisions make no measurable progress.
The design of the repository interface, patch tool, test runner, and verifier
matters as much as the model prompt.

### Exercise 8: Coding-agent evaluation suite

Create a fixed set of small repository tasks covering bug fixes, focused
features, refactors, and explanation-only questions. Preserve held-out tasks
that are not used while tuning prompts or tools.

Measure:

- task success and regression rate;
- scope correctness of the final diff;
- invalid and redundant tool calls;
- number of iterations;
- latency, tokens, and cost;
- verifier false positives and false negatives.

Keep full trajectories so failures can be classified rather than reduced to a
single pass or fail value.

## Phase 3: Build a visual mathematics and physics agent

### Exercise 9: Declarative visual explainer

Give the ReAct agent tools for constructing a small visual environment. A user
supplies a concept such as vector addition, projectile motion, harmonic motion,
derivatives, or conservation of energy.

Start with a static declarative scene specification containing:

- a coordinate system or scene;
- mathematical notation;
- visual objects and labels;
- a concise conceptual explanation.

A renderer executes the specification. The agent must not generate unrestricted
application code. This keeps content decisions separate from rendering and
makes the output testable.

### Exercise 10: Interactive verified simulation

Add adjustable parameters, animation or step-by-step progression, and tools for
rendering and inspecting the result.

Verification should include:

- mathematical invariants and units;
- required visual elements;
- valid parameter ranges;
- synchronization between equations and animation;
- render success.

Visual and pedagogical quality still require a rubric or human judgment.

Example challenge:

> Build an interactive projectile-motion scene. Let the learner adjust launch
> speed and angle. Show the velocity components, trajectory, current position,
> elapsed time, and the relationship between the animation and equations.

### Exercise 11: Maker and checker

Separate the system into two contexts:

- a maker builds the explanation;
- a checker receives only the requirements and rendered result, then reports
  specific mathematical, pedagogical, and visual problems.

Limit revision rounds and measure whether the checker catches real defects.
Model self-criticism is a fallible observation, not ground truth. Independent
mathematical and structural checks remain authoritative where available.

## Phase 4: Memory, planning, and controlled evolution

### Exercise 12: Versioned skill library

Persist successful, reusable strategies across coding and visual tasks. Examples
include repository exploration patterns, verification recipes, coordinate-system
layouts, vector diagrams, animation patterns, and misconception checks.

Every stored skill should include provenance, version, applicable task types,
validation evidence, and known failures. Retrieve only relevant skills and
validate their result in the current environment. Durable memory must not turn
one incorrect trajectory into a permanent rule.

### Exercise 13: Planner, executor, and branching alternatives

Plan complex tasks as independently verifiable steps and re-plan when execution
or verification contradicts the plan. Generate multiple candidates only for
difficult, consequential choices and select between them using explicit
criteria.

Compare planned and direct ReAct execution on the same task set. Keep planning
only where it improves success enough to justify its additional latency and
cost.

### Exercise 14: Specialized agent team

Compare a single agent with specialists such as an explorer, implementer,
verifier, mathematician, visual composer, or pedagogy checker. Give each agent a
clear context and responsibility.

Use the same task set and measure correctness, regressions, user preference,
latency, and cost. Keep the multi-agent design only where it demonstrably
improves results.

### Exercise 15: Evaluation-driven self-improvement

Collect trajectories from earlier exercises, classify recurring failures, and
propose changes to prompts, tools, policies, or reusable skills. Evaluate one
bounded candidate change at a time on fixed training and held-out task sets.

```text
run tasks
-> collect evidence
-> identify a recurring failure
-> propose one bounded change
-> evaluate against baselines and held-out tasks
-> promote or reject
```

Promote a change only when it improves defined metrics without unacceptable
regressions. The agent must not freely rewrite its production harness.
Evolution happens through versioned candidates, sandboxed evaluation, explicit
promotion rules, and rollback.

## The continuing thread

The same control loop remains visible throughout the roadmap:

```text
reason -> act -> observe -> update -> terminate or continue
```

The focus evolves through:

```text
explicit safe loops
-> validated tool use
-> LLM-driven decisions
-> repository inspection and editing
-> external verification
-> visual world construction
-> memory and planning
-> measured self-improvement
```
