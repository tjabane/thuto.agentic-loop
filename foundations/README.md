# Agent foundations

This project studies agentic control loops from first principles. It starts
with deterministic policies, introduces validated tool dispatch, and then
replaces the policy with an LLM while keeping execution and safety in the
harness.

## Project map

- `implementations/` contains the executable exercises and roadmap.
- `papers/` contains the source papers.
- `notes/` contains paper-specific reading notes.
- `report/` contains the final synthesis.
- `docs/` contains supporting guides and longer-form reference material.

## Completion boundary

The project is complete when it demonstrates:

1. an explicit Reason-Act-Observe loop;
2. a generic, validated tool dispatcher;
3. an LLM policy using the same harness as a deterministic policy;
4. limits, structured trajectories, and explicit terminal states; and
5. a comparison of deterministic and LLM behavior.

The coding-agent application lives in the sibling
[`basic-coding-agent`](../basic-coding-agent/README.md) project.
