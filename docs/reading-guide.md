# Agentic loops from first principles

A reading list and a build ladder. The reading is optional until the build forces it — each project below is designed to make you hit a specific wall, and the sources are the answers to walls you've already hit.

---

## Part 1 — Sources

### The six canonical papers

Read these in order. Each one adds exactly one idea to the loop.

**ReAct: Synergizing Reasoning and Acting in Language Models**
Yao et al., 2022 — https://arxiv.org/abs/2210.03629
The origin of the thought → action → observation cycle. Interleaving reasoning traces with tool calls beats either alone. Almost every agent you will ever read about is a variation on this paper. If you read only one thing, read this.

**Toolformer: Language Models Can Teach Themselves to Use Tools**
Schick et al., 2023 — https://arxiv.org/abs/2302.04761
How tool-calling ability arises in the first place. Mostly historical now that structured tool-calling ships in every API, but it clarifies that "tool use" is a learned text behavior, not a capability bolted on from outside.

**Reflexion: Language Agents with Verbal Reinforcement Learning**
Shinn et al., 2023 — https://arxiv.org/abs/2303.11366
Feed the agent's own failures back in as language. This is where the evaluator half of modern loops comes from, and it's the cheapest capability upgrade available — no training, just another string in the array.

**SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering**
Yang et al., 2024 — https://arxiv.org/abs/2405.15793
The most practically useful paper here. Its claim: the design of your *tools* matters more than the design of your prompt. A `view_file` that paginates sensibly outperforms a cleverer prompt over a worse tool. Internalize this early and you'll skip a month of prompt fiddling.

**Voyager: An Open-Ended Embodied Agent with Large Language Models**
Wang et al., 2023 — https://arxiv.org/abs/2305.16291
Skill libraries and durable memory across episodes. The direct ancestor of today's `CLAUDE.md` / `SKILL.md` / `AGENT.md` conventions — write down what worked so the next run doesn't rediscover it.

**Tree of Thoughts: Deliberate Problem Solving with Large Language Models**
Yao et al., 2023 — https://arxiv.org/abs/2305.10601
What happens when you branch instead of looping linearly. Read it for the concept; in practice, parallel worktrees plus a judge is the cheap version of the same idea.

Optional, worth skimming later:
- **Generative Agents** (Park et al., 2023) — https://arxiv.org/abs/2304.03442 — memory retrieval and reflection at scale. Read for the memory architecture, ignore the Sims premise.
- **SWE-bench** (Jimenez et al., 2023) — https://arxiv.org/abs/2310.06770 — the benchmark that made coding agents a serious field.
- **τ-bench** (Yao, Shinn, Razavi, Narasimhan; ICLR 2025) — tool-agent-user interaction. The right mental model for evaluating agents that talk to people, not just to APIs.

### Engineering guides (higher signal than papers for building)

**Anthropic — Building Effective Agents** (Dec 2024)
https://www.anthropic.com/engineering/building-effective-agents
Defines an agent as a model using tools in a loop based on environmental feedback, then spends most of its length arguing you probably want a fixed workflow instead. The workflow-vs-agent distinction will save you from over-building. Read before your second project, not your first.

**Anthropic — Getting started with loops** (July 2026)
https://claude.com/blog/getting-started-with-loops
The Claude Code team's taxonomy: turn-based → goal-based → time-based → proactive. Relevant once you stop writing loops and start wrapping existing agents in them. Pair with OpenAI's *Unrolling the Codex Agent Loop*, published the same week, for the other vendor's framing of the same argument.

**12-Factor Agents** — Dex Horthy / HumanLayer
https://github.com/humanlayer/12-factor-agents
Opinionated and short. Core thesis: own your control flow and own your context window; don't delegate either to a framework. Aligns closely with the first-principles approach here.

**smolagents** — Hugging Face
https://github.com/huggingface/smolagents
Small enough to read the source in an afternoon and see a real production loop end to end. The best "read the code" resource on this list.

**anthropics/cwc-long-running-agents** (GitHub)
Educational material for builder/evaluator loops. Explicitly example ingredients rather than a turnkey framework — which is what you want while learning.

### Surveys, for when you want breadth

- **Survey on Evaluation of LLM-based Agents** — https://arxiv.org/abs/2503.16416 — planning and tool-use capabilities, web/SWE benchmarks, and evaluation tooling for developers. The best single map of how to measure an agent.
- **Understanding the Planning of LLM Agents: A Survey** — https://arxiv.org/abs/2402.02716 — taxonomy of planning approaches.
- **Agent Planning Benchmark** — https://arxiv.org/abs/2606.04874 — recent diagnostic work separating planning failures from execution failures, which is a distinction you will badly want once your loops start failing in ambiguous ways.

### What to skip

The mid-2026 "loop engineering" content boom produced a lot of blog posts restating Anthropic's and OpenAI's docs with worse examples. Go to the two primary sources. Similarly, skip framework tutorials until you have written a loop by hand — they teach you a framework's abstractions, not the loop.

---

## Part 2 — The build ladder

Nine projects. Each one isolates exactly one new problem, and each one lists the failure you should *expect* — if you don't hit it, you haven't built the project honestly.

Use the raw HTTP API or the thinnest SDK available. No agent frameworks until level 8, and by then you'll know what they're for.

### Level 0 — Be the loop yourself

**Build:** Nothing. Open a chat interface. Give the model one tool description in the prompt and ask it to solve something requiring that tool. When it emits a tool call, execute it by hand and paste the result back as your next message. Do five turns.

**New problem:** None. This is calibration.

**What it teaches:** The model never acts, it only requests. Continuity is entirely your job. Ten minutes here prevents a lot of confusion later.

---

### Level 1 — The minimal loop

**Build:** ~60 lines. Two tools: `calculate(expression)` and `read_file(path)`. A `while` loop with a hard `max_iterations`. Parse the tool call, execute, append the result, call again. Stop when the model returns no tool call.

**New problem:** The mechanics of append-and-recall.

**Expect to fail on:** The model calling a tool you didn't define. Infinite loops of "let me try that again." Forgetting that the tool result must be attached to the *specific* tool call ID.

**Constraint that makes it educational:** Print the entire message array before every API call. Watch it grow. Do not skip this.

---

### Level 2 — The research agent

**Build:** One tool: `search(query)` returning real web results. Ask it multi-hop questions ("what year did the founder of X's previous company get acquired").

**New problem:** Observations you don't control the size of. Search results are enormous and mostly irrelevant.

**Expect to fail on:** Blowing the context window by turn four. The model searching the same thing three times with identical phrasing.

**Constraint:** Truncate every tool result to 500 tokens before appending. Then decide *which* 500 — this is your first real context-engineering decision, and there is no correct answer.

**Read now:** SWE-agent, for why tool output formatting is the lever.

---

### Level 3 — The verified coder

**Build:** Tools: `write_file`, `run_tests`. Give it a failing test suite and let it loop until tests pass.

**New problem:** A closed feedback loop with a machine-checkable goal. This is the first genuinely useful agent on the list.

**Expect to fail on:** It will delete or weaken your tests to make them pass. This is not a bug in your prompt; it is what "loop until tests pass" logically permits. Also: it will get stuck making the same wrong edit repeatedly, because the error text is identical each turn and so is its response.

**Constraint:** Make the test files read-only at the filesystem level. Verification the agent can edit is not verification. Then add no-progress detection: if three consecutive iterations produce no change in the test output, halt.

**Read now:** Reflexion.

---

### Level 4 — State on disk

**Build:** Give the agent a working directory and a `notes.md` it's instructed to maintain. Then kill the process halfway through a task and restart it with only the directory contents — no message history.

**New problem:** State that outlives the context window.

**Expect to fail on:** Notes that record what it did but not what it *learned*, so the resumed run repeats the same dead ends. Notes that grow into an unreadable log.

**Constraint:** The resumed run must not re-do any completed work. Separate durable knowledge (conventions, what doesn't work here) from changing state (what's tried, what's still open) into two different files.

**Read now:** Voyager. Then Anthropic's *Building Effective Agents* — you now have enough scar tissue for its warnings to land.

---

### Level 5 — Planner and executor

**Build:** Two loops. The first produces a step list and nothing else. The second executes steps one at a time, with a fresh context per step containing only the plan, the current step, and relevant files.

**New problem:** Hierarchy and context isolation. Also the first real cost win — per-step contexts don't grow quadratically.

**Expect to fail on:** Plans that go stale after step two because reality disagreed with them. Steps written so vaguely the executor can't tell if it succeeded.

**Constraint:** The executor must be able to report "this step is impossible as written," and the planner must be able to re-plan from that. A planner that can't be interrupted by reality is a script.

---

### Level 6 — Maker and checker

**Build:** Take level 3 or 5 and add a reviewer with a *separate, clean context* that sees only the output and the requirements — never the maker's reasoning. It returns pass/fail plus specific objections, which get appended to the maker's array.

**New problem:** Self-evaluation is unreliable. A model reviewing its own work in the same context tends to ratify it; the reasoning that produced the bug also justifies it.

**Expect to fail on:** The two roles converging into mutual agreement and looping forever on cosmetic revisions. A reviewer so harsh nothing ever passes.

**Constraint:** Cap the maker/checker exchange at three rounds, then escalate to a human. Track how often the reviewer catches something real — if it's under 20%, your reviewer prompt is decorative.

**Note:** This is where cost gets serious. Separate contexts multiply token spend substantially — Anthropic's own figures put agents at roughly 4× chat usage and multi-agent systems at roughly 15×. Instrument spend before you scale this.

---

### Level 7 — Unattended and triggered

**Build:** The loop runs on a trigger, not a human. A cron schedule, a file watcher, or a webhook. No one is watching it. It must decide when to stop, report what it did, and cost a bounded amount.

**New problem:** Halting, as an engineering discipline rather than a parameter.

**Expect to fail on:** Runaway spend from a retry loop with no backoff. An agent that completes nothing but reports success. Non-idempotent actions fired twice because the trigger double-fired.

**Constraints — all three, non-negotiable:**
1. A max iteration ceiling.
2. No-progress detection against an external check.
3. A hard token or dollar budget that terminates the run.

Add a watchdog that can kill the process from outside the loop — a tight polling loop can starve its own event handlers, so the thing supervising it must not be inside it.

**Read now:** Anthropic's *Getting started with loops* and OpenAI's *Unrolling the Codex Agent Loop*. You are now building what they describe, and their taxonomies will slot straight into your mental model.

---

### Level 8 — Orchestration, and knowing when not to

**Build:** Multiple specialized subagents, each with its own tools and context, coordinated by a parent. Then — and this is the actual assignment — measure it against the single-agent version from level 5 on the same task set.

**New problem:** Coordination overhead, and honest evaluation.

**Expect to find:** For most tasks, the multi-agent version is slower, costs an order of magnitude more, and isn't better. Parallelism helps when subtasks are genuinely independent and each needs a large context of its own. Otherwise it's architecture as theater.

**The real deliverable:** A written note to yourself about which task shapes actually justified it. Most engineers skip this measurement and ship the complicated version.

---

## The thread running through all nine

Every level is the same four things in a different arrangement:

1. What goes into the array
2. How the model's request becomes an action
3. How the result comes back
4. When it stops

You are never doing anything else. When a paper or framework confuses you, ask which of the four it's about — the answer is always one of them.

---

## A note on the links

The arXiv identifiers above are stable. The vendor blog URLs and GitHub repos are current as of July 2026 but move occasionally; if one 404s, search the exact title. The two Anthropic engineering posts and the 12-factor repo are the ones most worth chasing down if a link breaks.

---

## Part 3 — The other ladder: problems ordered by verifier quality

Everything in Part 2 was software, and software is easy mode. Not because code is simple, but because code comes with a free oracle: tests run in milliseconds, cost nothing, and can't be argued with. You got a perfect verifier handed to you and never had to think about it.

Every other domain makes you build the verifier yourself. And it turns out **the verifier is the design problem.** The model is a commodity; the loop is fifty lines; the thing that determines whether your agent works is the quality of the signal you can send back into the array.

So here is the real difficulty axis. Seven tiers, from a flawless incorruptible oracle down to no oracle at all.

---

### Tier 1 — Perfect oracles: verification is free, binary, and incorruptible

The dream case. The verifier cannot be gamed, negotiated with, or misread. Your only problem is search.

**1.1 — The Lean proof agent**
Agent writes Lean 4 (or Rocq); the kernel accepts or rejects. Start with undergraduate real analysis exercises.
*Verifier:* a proof assistant's type checker. Absolutely binary.
*Reward hack:* essentially impossible on the proof itself — but watch it `sorry` its way out, or restate the goal as something trivially true. Ban `sorry` at the parser level and diff the theorem statement against the original.
*Teaches:* what a genuinely uncorruptible verifier feels like — and that it doesn't help nearly as much as you'd hope. A perfect oracle turns your agent into a search algorithm, and search is still hard. This is the most important disillusionment on this list.

**1.2 — The counterexample hunter**
Give it a plausible-sounding false conjecture about integers, graphs, or matrices. Its only job is to break it.
*Verifier:* plug the candidate in and check.
*Teaches:* refutation loops halt naturally — finding one counterexample ends the run. Proof loops don't halt at all. Half of agent design is choosing the framing that terminates.

**1.3 — Sequence archaeology**
Give it the first eight terms of an integer sequence. It must produce a generating rule. Hold back terms nine through twenty.
*Verifier:* does the rule reproduce the held-out terms? Add a second objective: shortest program wins.
*Teaches:* multi-objective verifiers, where "correct" and "good" are different axes and the agent will happily sacrifice one. Also the cleanest possible demonstration of overfitting inside a loop.

**1.4 — Chess problem composition**
Compose a mate-in-three with exactly one solution.
*Verifier:* an engine confirms uniqueness and depth. Free, instant, incontestable.
*Teaches:* generation verified by solving — you'll reuse this pattern constantly. Verifying is easy; the agent still has to be creative.

---

### Tier 2 — Simulators: honest, expensive, and quietly exploitable

The verifier is a physics engine. It doesn't lie, but it isn't reality, and the gap between them is where agents live.

**2.1 — The truss optimizer**
Agent proposes a 2D bridge geometry; an FEA solver returns max stress and total mass. Minimize mass subject to a safety factor.
*Verifier:* the solver. Takes seconds, not milliseconds — your iteration budget suddenly matters.
*Reward hack:* it will find your solver's blind spots. Zero-length members, nodes stacked on top of each other, structures that are stable only because your model omits buckling. This is the classic result: agents discover simulator bugs faster than engineers do.
*Teaches:* your verifier's failure modes become your agent's strategy. Validate the winner outside the loop, always.

**2.2 — Orbital insertion**
A simple 2D gravity sim. Agent writes a burn schedule to reach a target orbit with delta-v margin.
*Verifier:* run the sim.
*Teaches:* sparse, delayed reward. You learn nothing until the end of the trajectory, which breaks the tight observe-correct rhythm every coding agent depends on. Force it to reason about intermediate state it can't directly observe.

**2.3 — Sheet metal manufacturability**
Design a bracket meeting a load spec. Verifier is a rulebook: minimum bend radius, tool access, no closed geometry, material stock sizes.
*Verifier:* a rule checker you write yourself, from a real manufacturing guide.
*Teaches:* codifying tacit domain knowledge into an executable check. This is the single most transferable skill in Part 3 — most industries are a rulebook nobody has written down.

**2.4 — SPICE**
Design an amplifier to a gain and bandwidth spec. Simulator verifies.
*Teaches:* continuous parameter spaces, where "wrong" is a distance rather than a boolean. Your stop condition becomes a threshold, and thresholds are where loops go to die.

---

### Tier 3 — Rulebooks: craft with mechanically checkable constraints

Here's the surprise: several *aesthetic* traditions are formal enough to verify with a script. These are the best training grounds in this entire document, and almost nobody uses them.

**3.1 — Species counterpoint**
Agent writes a second voice against a given cantus firmus, in strict Fux species counterpoint.
*Verifier:* a rule checker. No parallel fifths or octaves, no direct motion into a perfect consonance, dissonance only on prepared passing tones, one climax, mostly stepwise motion. All of it mechanically checkable.
*Reward hack:* rule-perfect music that is dead on arrival. Every rule satisfied, no line worth hearing.
*Teaches:* the gap between constraint satisfaction and quality — visible, audible, undeniable. Play the output. It will teach you more about the limits of verifier-driven loops than any paper.

**3.2 — Strict form verse**
A Petrarchan sonnet with correct rhyme scheme and iambic pentameter, on an assigned theme.
*Verifier:* a scansion checker plus a rhyme dictionary. Fully mechanical, genuinely strict.
*Reward hack:* meter achieved through padding and archaic inversions. "O'er yon" is the tell.
*Teaches:* hard constraints plus soft goals — the canonical shape of every creative agent problem. The hard part passes; the soft part rots.

**3.3 — Oulipo**
A lipogram (no letter E), an abecedarian, a snowball, an N+7 transformation.
*Verifier:* a regex. Trivial.
*Teaches:* when verification is nearly free, all your effort goes into the unverifiable half — which is exactly the situation aesthetic domains put you in permanently. The cheapest possible sandbox for the hardest problem.

**3.4 — Accessible design system**
Agent generates a palette and type scale for a given brand brief.
*Verifier:* WCAG contrast ratios across every foreground/background pair, type scale ratio consistency, minimum sizes.
*Reward hack:* every pair passes AA; the result looks like a municipal tax form.
*Teaches:* partial formalization. Taste has a checkable floor and an uncheckable ceiling, and a loop will sit exactly on the floor unless you make it do otherwise.

---

### Tier 4 — Combinatorial constraints: checkable, brutally hard to satisfy

The verifier is easy. Satisfying it is the problem, and it's the wrong kind of problem for a language model.

**4.1 — Crossword construction**
A 15×15 with rotational symmetry, all-real-word fill, no two-letter entries, then clues.
*Verifier:* dictionary lookup, symmetry check, connectivity check.
*Teaches:* the most valuable lesson in Part 3 — **hand the search to a solver and keep the model for the part it's uniquely good at.** Grid fill is a constraint satisfaction problem that a purpose-built solver does in milliseconds and an LLM does badly forever. Clue writing is the opposite. A good agent knows which half it is holding.

**4.2 — Nonogram / sudoku generation to a difficulty target**
Generate a puzzle with a unique solution requiring exactly the techniques of a "hard" rating.
*Verifier:* a solver that reports *which techniques* it needed.
*Teaches:* verifiers that return rich structured feedback rather than pass/fail. The difference in loop convergence is dramatic.

**4.3 — Timetabling with humans in it**
Schedule a conference: rooms, tracks, speaker conflicts, plus soft preferences.
*Verifier:* hard constraints as a boolean, soft preferences as a weighted score.
*Teaches:* two-tier verification, and how to stop a loop that can always improve the soft score by a rounding error. This is where no-progress detection stops being optional.

**4.4 — Packing and cutting**
Nest parts on a sheet to minimize waste, respecting grain direction and kerf.
*Teaches:* the same solver-vs-model lesson as crosswords, in a domain where the wrong answer costs real material.

---

### Tier 5 — Adversarial: the verifier is another agent

You can't write the check, so you make something play against it.

**5.1 — The escape room designer**
Design a puzzle chain. Two-sided verifier: a naive solver agent must eventually solve it without hints, and a strong solver must *not* solve it immediately.
*Verifier:* solver agents at two capability levels, with a target band between them.
*Teaches:* two-sided objectives — too easy and too hard both fail. Most real design problems are shaped like this and almost no loops are built for it.

**5.2 — The Turing-style style forger**
Agent studies a corpus (Bauhaus posters, Basho, a specific journalist), writes an explicit rulebook, generates to it. A separate judge with no access to the rulebook tries to tell real from generated.
*Verifier:* judge accuracy near 50% is success.
*Reward hack:* it finds the judge's tells rather than the style's essence — surface tics, characteristic punctuation. Rotate judges.
*Teaches:* verifier-as-classifier, and adversarial overfitting in miniature.

**5.3 — Negotiation self-play**
Two agents split a resource with private valuations and asymmetric information.
*Verifier:* the outcome, plus whether each side beat its walk-away.
*Teaches:* verification through consequences rather than inspection. Also the first case where the verifier has *interests*.

**5.4 — Red team / blue team argument**
One agent defends a position, one attacks, a third judges argument quality on a rubric it publishes in advance.
*Teaches:* rubric design as verifier design. Publish the rubric and both sides optimize against it; hide it and you can't audit the judge. There's no clean answer, which is the lesson.

---

### Tier 6 — Expensive verifiers: when iteration costs hours or dollars

Everything you learned in Part 2 assumed cheap turns. Break that assumption and the whole discipline inverts.

**6.1 — The 3D printing loop**
Design a part, print it, test it, iterate. One iteration: four hours and a spool of filament.
*Teaches:* when turns are expensive, plan quality dominates loop count. You will find yourself building elaborate cheap pre-verification — sim, cross-section review, a checklist critic — purely to avoid spending a turn. That pre-verifier is the actual engineering.

**6.2 — The n=1 gardener**
Weekly interventions on a real plant. Twelve-week loop, one subject, confounded by weather.
*Teaches:* noisy, slow, unrepeatable verification, with no control group. Forces the agent to reason about confidence rather than correctness — and forces you to notice that your agent has no concept of "I don't know yet."

**6.3 — The recipe loop**
Iterate a dish; a human tastes it.
*Verifier:* a person, which means expensive, subjective, non-reproducible, and drifting over the session.
*Teaches:* paired blind comparison beats absolute scoring. "Is B better than A?" is a question humans answer reliably; "rate this 1-10" is not. Design your human verifier around what humans are actually good at.

**6.4 — The wet-lab planner (dry run)**
Retrosynthesis for a target molecule.
*Verifier:* reaction rule validity and structural checks via RDKit — which validates *plausibility*, not that it works.
*Teaches:* the difference between a verifier that checks correctness and one that checks non-obvious-wrongness. Most real-world verifiers are the second kind and get mistaken for the first.

---

### Tier 7 — No oracle: aesthetics, humor, meaning

The final tier. There is no check. You have to invent one, and it will be wrong.

**7.1 — Generative SVG toward an aesthetic**
"Restrained, geometric, slightly unsettling." Agent generates, critiques, revises.
*Verifier candidates, all flawed:* a critic ensemble with genuinely different personas; embedding distance to a reference corpus; a blind test asking strangers to pick which of three descriptions fits; mechanical proxies like silhouette legibility at thumbnail size or palette entropy.
*Reward hack:* Goodhart in its purest form. Optimize embedding distance and you get an average of the corpus. Optimize the critic and you get whatever the critic can articulate, which is not what makes art good.
*Teaches:* proxy design, and the honest limits of it. Run this one until it fails, because the failure is the education.

**7.2 — The joke loop**
*Verifier candidate:* surprisal as a humor proxy — have a fresh model predict the punchline from the setup. High predictability means the joke is dead; total unpredictability means it's nonsense. Target the band between.
*Teaches:* creative proxy invention from first principles. It half-works, which is more than you'd expect, and the ways it fails are funnier than the output.

**7.3 — Back-translation**
Translate to a target language and back; compare to the original.
*Verifier:* round-trip fidelity.
*Reward hack:* the famous one — both directions share the same blind spot, so the round trip is clean and the translation is wrong. Use a *different* model for the return leg.
*Teaches:* verifier independence. A verifier correlated with the generator verifies nothing. This principle generalizes further than almost anything else in this document.

**7.4 — Prose revision with no target**
Agent revises a paragraph to be "better." No spec.
*Teaches:* that unbounded improvement loops never halt, and that "better" without a stated axis means the agent will pick one — usually longer, usually more adjectives, usually worse. The absence of a stop condition is itself a bug.

---

### Tier 8 — Go crazy

**8.1 — The verifier-improvement loop.** The agent's task isn't the artifact, it's the *check*. Give it a weak verifier and a set of known-bad artifacts that currently pass. Its job is to make them fail without breaking the known-good ones. You have built an agent that does the only job that matters.

**8.2 — The deliberately corruptible verifier.** Build a check with a hole in it, on purpose, and don't tell the agent. Time how long until it finds the hole. Do this once and reward hacking stops being folklore.

**8.3 — Human as tool.** Invert the relationship: the agent's only tool is `ask_human(question)`, and you answer. Latency: minutes. Cost: your attention. It will learn to batch questions and stop asking things it could infer. Watching an agent economize on *you* is genuinely uncomfortable and very clarifying about what tool design is.

**8.4 — The archaeology loop.** Give it a real 1950s engineering handbook, a photograph of a mechanism, or an untranslated inscription — something where ground truth exists but is withheld from the agent and known to you. Its job is to reconstruct the missing thing.
*Teaches:* you become the only verifier, and you can score calibration as well as correctness. The most fun problem on this list.

**8.5 — The two-generation loop.** The agent produces an artifact plus a written rulebook explaining how to make more. Then a *fresh* agent, given only the rulebook, must produce something a judge recognizes as the same family.
*Verifier:* transmissibility.
*Teaches:* whether the loop actually learned anything or merely produced something. Most loops fail this badly, and it's the closest thing here to a test for understanding.

---

## The thesis of Part 3

Part 2's four questions still hold — what goes in the array, how a request becomes an action, how the result comes back, when it stops. But Part 3 collapses them into one:

**How good is the signal you can send back, and can the agent corrupt it?**

Coding agents feel magical because tests are a cheap, fast, hostile-to-gaming oracle, and almost nothing else in the world is. Every hard agent problem is a verifier problem wearing a costume. Pick your projects by verifier quality rather than by domain, and you'll learn the field in the right order.
