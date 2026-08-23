# Thuto Agentic Loop

A TypeScript learning workspace that builds an agentic control loop in four
small steps: start with a terminating loop, make Reason–Act–Observe explicit,
add deterministic action selection in a maze, and finally let an LLM choose
maze actions inside a validated harness.

The common control flow is:

```text
reason -> act -> observe -> update -> terminate or continue
```

## Projects

### 01 — Secret number: exit-condition loop

[`01-secret-number-exit-condition-loop/`](./01-secret-number-exit-condition-loop/README.md)
introduces the mechanics of an agentic loop through a number-guessing problem.
The program chooses a guess, observes whether it is too low, too high, or
correct, and stops on success or after ten attempts.

This first solution keeps the loop deliberately small so its state, feedback,
and termination conditions are easy to see.

Run its tests:

```powershell
npx tsx --test 01-secret-number-exit-condition-loop/index.test.ts
```

### 02 — Secret number: Reason–Act–Observe loop

[`02-secret-number-reason-act-observe-loop/`](./02-secret-number-reason-act-observe-loop/README.md)
refactors the same problem into explicit boundaries for reasoning, actions,
environment observations, state updates, history, and termination.

The hidden number remains environment-owned, while the deterministic binary
search policy can use only the agent state. This is the structural bridge from
an ordinary loop to a ReAct-style agent.

Run its tests:

```powershell
npx tsx --test 02-secret-number-reason-act-observe-loop/index.test.ts
```

Open its standalone visualization in a browser:

```text
visualizations/secret-number-visualization.html
```

The visualization is self-contained and does not require a local server or API
key.

### 03 — Deterministic maze agent

[`03-maze-determistic/`](./03-maze-determistic/README.md) expands the loop into
a partially observed maze with multiple action types. A hand-written policy
must explore rooms, remember blocked movement, collect a key, navigate to the
exit, unlock it, and terminate safely.

The environment owns the real maze while the agent maintains only knowledge it
has learned through observations. The test suite covers action selection,
environment rules, route planning, different maze layouts, unreachable goals,
and the action limit.

Run its tests:

```powershell
npx tsx --test 03-maze-determistic/tests/*.test.ts
```

### 04 — LLM maze agent

[`04-maze-llm-agent/`](./04-maze-llm-agent/README.md) replaces the deterministic
maze policy with an OpenAI model. The application still owns observation,
state transitions, action validation, execution, and termination; the model is
responsible only for selecting the next supported action from verified state.

Its normal tests use test doubles and do not make API requests:

```powershell
npx tsx --test 04-maze-llm-agent/tests/unit/*.test.ts
```

Live integration tests make billable OpenAI API requests. Configure them in
PowerShell before running the suite:

```powershell
$env:OPENAI_API_KEY="your-api-key"
$env:OPENAI_MODEL="gpt-5.6-luna"
$env:RUN_LIVE_LLM_TESTS="true"
$env:LLM_E2E_MAX_ACTIONS="25"
npm run test:llm:live
```

`LLM_E2E_MAX_ACTIONS` limits the number of environment actions in each
scenario. Do not commit API keys to the repository.

## Maze visualization

[`visualizations/maze-visualization/`](./visualizations/maze-visualization/README.md)
runs solution 04 behind a local HTTP server, keeping the OpenAI API key out of
browser JavaScript. Configure at least `OPENAI_API_KEY`; `OPENAI_MODEL` is
optional when the implementation's default is suitable.

Start it from the repository root:

```powershell
$env:OPENAI_API_KEY="your-api-key"
$env:OPENAI_MODEL="gpt-5.6-luna"
npm run visualization:start
```

Then open [http://localhost:3000](http://localhost:3000). The page can generate
a random solvable 3-by-3 maze, run the LLM agent, and replay its actions.

To rebuild only the browser bundle:

```powershell
npm run visualization:build
```

## Setup

Requirements:

- Node.js 20 or newer;
- npm;
- an OpenAI API key only for live LLM tests and the maze visualization.

Install dependencies from the repository root:

```powershell
npm install
```

## Workspace commands

Run all tests except billable live LLM scenarios:

```powershell
npm test
```

Other useful commands:

```powershell
npm run typecheck
npm run build
npm run lint
npm run format
```

Compiled TypeScript is written to `dist/`. The normal test command discovers
tests from all four numbered solution folders; live LLM scenarios are skipped
unless explicitly enabled.

## Repository layout

```text
01-secret-number-exit-condition-loop/
02-secret-number-reason-act-observe-loop/
03-maze-determistic/
04-maze-llm-agent/
visualizations/
  maze-visualization/
  secret-number-visualization.html
ROADMAP.md
```

[`ROADMAP.md`](./ROADMAP.md) describes the broader learning progression and the
boundaries between deterministic policies, model-driven decisions, and the
execution harness.

## Resources

- [Agentic Coding: The Harness](https://lilianweng.github.io/posts/2026-07-04-harness/)
- [Building an Anthropic-Style Coding Agent](https://elsevanderberg.substack.com/p/building-an-anthropic-style-coding)
- [The Components of a Coding Agent](https://magazine.sebastianraschka.com/p/components-of-a-coding-agent)
- [A Practical Guide to Building AI Agents](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/)
