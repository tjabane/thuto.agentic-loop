# Implementation roadmap

This roadmap builds agentic systems from first principles. ReAct is the first
usable architecture, not the final destination. Later exercises add visual
worlds, verification, memory, adaptation, planning, and controlled
self-improvement.

Research agents are deliberately not part of the main path. The first agentic
application will instead create interactive visual explanations of mathematics
and physics.

## Phase 1: Learn the loop without an LLM

### Exercise 1: Exit-condition loop

Choose an action, observe feedback, update state, and terminate safely.

See [Exercise 1](./01-exit-condition-loop/README.md).

### Exercise 2: Explicit Reason-Act-Observe loop

Separate the decision policy, action, environment, observation, state update,
history, and termination logic.

See [Exercise 2](./02-reason-act-observe-loop/README.md).

### Exercise 3: Multiple-action agent

Navigate a visualizable maze by choosing between inspecting, moving, taking an
item, and unlocking an exit.

See [Exercise 3](./03-multiple-action-agent/README.md).

### Exercise 4: Tool interface and dispatcher

Turn the actions from Exercise 3 into named tools with schemas, validation,
structured results, and a generic dispatcher. The deterministic policy remains
in place so the tool harness can be tested independently of an LLM.

## Phase 2: Introduce the LLM

### Exercise 5: Minimal LLM ReAct agent

Replace the deterministic policy with an LLM. On each turn, the model must
choose one validated tool call or return a final answer. Preserve the existing
state, history, execution, and termination boundaries.

This is the first LLM-based agent.

### Exercise 6: Visual mathematics and physics explainer

Give the ReAct agent tools for constructing a small interactive visual
environment. A user supplies a concept such as vector addition, projectile
motion, harmonic motion, derivatives, or conservation of energy. The agent
must build an explanation that combines:

- a coordinate system or scene;
- mathematical notation;
- visual objects and labels;
- adjustable parameters;
- animation or a step-by-step progression;
- a concise conceptual explanation.

The agent should produce a declarative scene or simulation specification rather
than unrestricted application code. A renderer executes that specification.
This keeps content decisions separate from rendering and makes the output
testable.

New problems introduced:

- translating abstract concepts into spatial representations;
- keeping equations, units, labels, and animation synchronized;
- selecting a useful representation rather than merely a correct one;
- deciding what should change when a learner adjusts a parameter;
- inspecting and revising a rendered result.

Verification should include mathematical invariants, units, required visual
elements, valid parameter ranges, and render success. Visual quality still
requires a rubric or human judgment.

Example challenge:

> Build an interactive projectile-motion scene. Let the learner adjust launch
> speed and angle. Show the velocity components, trajectory, current position,
> elapsed time, and the relationship between the animation and equations.

## Phase 3: Verification, reflection, and durable learning

### Exercise 7: Verified simulation builder

Allow the agent to revise a visual simulation after running numerical and
structural checks. Protect the verifier from modification. Detect repeated
failures and stop when revisions make no measurable progress.

This applies the agent-computer-interface lesson from SWE-agent: the design and
output of the scene, rendering, inspection, and verification tools matter as
much as the model prompt.

### Exercise 8: Maker and visual checker

Separate the system into two contexts:

- a maker builds the explanation;
- a checker receives only the requirements and rendered result, then reports
  specific mathematical, pedagogical, and visual problems.

Limit revision rounds and measure whether the checker catches real defects.
This introduces ideas from Self-Refine and Reflexion without treating model
self-criticism as ground truth.

### Exercise 9: Visual skill library

Persist successful, reusable visual strategies across tasks: coordinate-system
layouts, vector diagrams, animation patterns, unit displays, graph templates,
and common misconception checks. Retrieve only relevant skills for a new task.

This introduces Voyager-style durable memory and skill acquisition.

## Phase 4: MAPE-K adaptation

### Exercise 10: MAPE-K adaptive simulation agent

Build an agent around the MAPE-K control loop:

```text
Monitor -> Analyze -> Plan -> Execute
    \          |       |       /
       shared Knowledge base
```

All four stages read from or write to the shared knowledge base as appropriate.

The agent supervises a running physics simulation and keeps it within defined
quality and performance targets.

Suggested environment: an interactive orbital simulation. The simulation
exposes timestep, numerical integration method, rendering detail, and trail
length. During execution, numerical error or rendering load may increase.

#### Monitor

Collect observations such as:

- frame time and dropped frames;
- total-energy drift;
- orbital-position error against a reference;
- current timestep and integrator;
- recent parameter changes and outcomes.

#### Analyze

Determine whether the simulation violates an accuracy or performance target.
Distinguish likely numerical instability from rendering overload rather than
reacting to every metric in the same way.

#### Plan

Choose a bounded adaptation, such as:

- reduce or increase the timestep;
- switch the integration method;
- reduce visual detail or trail length;
- restore a previously stable configuration;
- take no action when the system is healthy.

#### Execute

Apply only validated configuration changes, observe their effect, and support
rollback when an adaptation makes the system worse.

#### Knowledge

Store:

- target thresholds and safety constraints;
- recent measurements;
- diagnoses and confidence;
- attempted adaptations and their outcomes;
- configurations known to be stable for particular conditions.

Success is not a single final answer. The agent must keep the simulation within
accuracy and performance targets over time while avoiding oscillation between
configurations.

New problems introduced:

- continuous monitoring rather than task-completion looping;
- separating symptoms, diagnoses, plans, and actions;
- delayed effects after an adaptation;
- hysteresis, cooldowns, rollback, and stability;
- shared knowledge that changes across control cycles;
- evaluating a system by behavior over time.

The exercise should first be solved with deterministic MAPE-K policies. An LLM
may later assist analysis and planning, but it must not bypass thresholds,
validation, or rollback controls.

## Phase 5: Deliberation and controlled evolution

### Exercise 11: Planner, executor, and branching alternatives

Plan complex visual environments as independently verifiable steps. Allow
re-planning when rendering or verification contradicts the plan. For difficult
representation choices, generate several candidates and select them with a
separate judge. This introduces Tree-of-Thoughts-style branching without
branching every decision.

### Exercise 12: Specialized visual-agent team

Compare a single agent with specialists for mathematics, simulation, visual
composition, and pedagogy. Use the same task set and measure correctness, user
preference, latency, and cost. Keep the multi-agent design only where it
demonstrably improves results.

### Exercise 13: Evaluation-driven self-evolving agent

Collect trajectories from earlier exercises, classify recurring failures, and
propose changes to prompts, tools, policies, or reusable skills. Evaluate each
candidate on fixed training and held-out task sets. Promote a change only when
it improves defined metrics without unacceptable regressions.

The improvement loop is:

```text
run tasks
-> collect evidence
-> identify recurring failures
-> propose one bounded change
-> evaluate against baselines and held-out tasks
-> promote or reject
```

The agent must not freely rewrite its own production harness. Evolution happens
through versioned candidates, sandboxed evaluation, explicit promotion rules,
and rollback.

## The continuing thread

ReAct remains one control loop inside the later systems, but it stops being the
main challenge. The focus evolves through:

```text
safe loops
-> tool use
-> visual world construction
-> mathematical verification
-> reflection and memory
-> adaptive control with MAPE-K
-> planning and orchestration
-> measured self-improvement
```
