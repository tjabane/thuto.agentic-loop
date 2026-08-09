# Basic coding agent

This is a separate follow-on project for applying the agent-loop foundations
to repository inspection, modification, and verification.

The project is intentionally independent of the learning exercises in
[`foundations`](../foundations/README.md). Shared abstractions should be
extracted only after both projects demonstrate a real need for them.

## Proposed progression

### 1. Read-only repository agent

Provide a small, bounded interface for listing files, searching text, reading
selected content, inspecting project metadata, and returning grounded answers
with file references.

Restrict paths to a fixture repository and reject path traversal.

### 2. Test-guided editing

Add patch application and an allowlisted command runner. The agent should
inspect, form a bounded hypothesis, edit, run a relevant check, observe the
result, and revise or finish.

Success requires passing verification and a final diff within task scope.

### 3. Hardened harness

Handle invalid calls, timeouts, unsafe paths, commands outside the allowlist,
unrelated diffs, repeated failures, growing context, and explicit iteration,
time, token, and cost budgets.

Destructive or external actions require a separate approval boundary.

### 4. Verification and evaluation

Keep verification policy outside the model. Inspect the final diff, relevant
test results, unexpected files, unresolved failures, and demonstrated
acceptance criteria.

Evaluate against fixed and held-out repository tasks, retaining full
trajectories for failure analysis.

## Status

Scaffolded but intentionally deferred until the foundations project is
complete and there is a clear learning or product objective.
