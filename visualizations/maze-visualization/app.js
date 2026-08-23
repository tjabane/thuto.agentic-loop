"use strict";
(() => {
  // visualizations/maze-visualization/controller.ts
  var mazeConfiguration = {
    rows: 3,
    columns: 3,
    blockedCells: [{ x: 1, y: 1 }],
    start: { x: 0, y: 0 },
    key: { x: 2, y: 0 },
    exit: { x: 2, y: 2 }
  };
  var runButton = document.getElementById(
    "autoButton"
  );
  var randomButton = document.getElementById(
    "randomButton"
  );
  var resetButton = document.getElementById(
    "resetButton"
  );
  var replayTimer;
  function makePositionKey(position) {
    return `${position.x},${position.y}`;
  }
  function positionsAreConnected(config) {
    const blocked = new Set(config.blockedCells.map(makePositionKey));
    const pending = [config.start];
    const visited = /* @__PURE__ */ new Set([makePositionKey(config.start)]);
    const targets = /* @__PURE__ */ new Set([
      makePositionKey(config.key),
      makePositionKey(config.exit)
    ]);
    const offsets = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0]
    ];
    while (pending.length > 0) {
      const current = pending.shift();
      if (!current) break;
      targets.delete(makePositionKey(current));
      for (const [xOffset, yOffset] of offsets) {
        const neighbour = {
          x: current.x + xOffset,
          y: current.y + yOffset
        };
        const key = makePositionKey(neighbour);
        if (neighbour.x >= 0 && neighbour.x < config.columns && neighbour.y >= 0 && neighbour.y < config.rows && !blocked.has(key) && !visited.has(key)) {
          visited.add(key);
          pending.push(neighbour);
        }
      }
    }
    return targets.size === 0;
  }
  function generateRandomMaze() {
    const rows = 3;
    const columns = 3;
    const start = { x: 0, y: 0 };
    const positions = Array.from({ length: rows * columns }, (_, index) => ({
      x: index % columns,
      y: Math.floor(index / columns)
    })).filter(
      (position) => makePositionKey(position) !== makePositionKey(start)
    );
    while (true) {
      const shuffled = [...positions].sort(() => Math.random() - 0.5);
      const key = shuffled[0];
      const exit = shuffled[1];
      if (!key || !exit) continue;
      const blockedCells = shuffled.slice(
        2,
        2 + (Math.random() < 0.5 ? 1 : 2)
      );
      const candidate = {
        rows,
        columns,
        start,
        key,
        exit,
        blockedCells
      };
      if (positionsAreConnected(candidate)) return candidate;
    }
  }
  function describe(event) {
    switch (event.type) {
      case "inspect":
        return `Inspecting (${event.position.x}, ${event.position.y})`;
      case "takeKey":
        return event.succeeded ? "Key collected" : "No key in this room";
      case "unlockExit":
        return event.succeeded ? "Exit unlocked" : "Exit could not be unlocked";
      case "exit":
        return event.succeeded ? "Agent escaped the maze" : "Agent did not escape";
      case "move":
        return event.succeeded ? `Moving ${event.direction}` : `Move ${event.direction} blocked`;
    }
  }
  function applyEvent(event) {
    if (event.type === "move") {
      if (event.succeeded) window.mazeVisualizer.move(event.direction);
      else window.mazeVisualizer.showBlockedMove(event.direction);
    } else if (event.type === "takeKey" && event.succeeded) {
      window.mazeVisualizer.takeKey();
    } else if (event.type === "unlockExit" && event.succeeded) {
      window.mazeVisualizer.unlockExit();
    } else {
      window.mazeVisualizer.showMessage(describe(event));
    }
  }
  function replay(trace, finalPosition, error) {
    let index = 0;
    window.mazeVisualizer.reset();
    const next = () => {
      const event = trace[index];
      if (event) {
        applyEvent(event);
        index += 1;
        replayTimer = window.setTimeout(next, 450);
        return;
      }
      replayTimer = void 0;
      window.mazeVisualizer.setState({
        x: finalPosition.x,
        y: finalPosition.y
      });
      if (error) window.mazeVisualizer.showMessage(error);
      if (runButton) {
        runButton.disabled = false;
        runButton.textContent = "Run LLM agent";
      }
      if (randomButton) randomButton.disabled = false;
    };
    next();
  }
  async function runAgent() {
    if (replayTimer !== void 0) return;
    if (runButton) {
      runButton.disabled = true;
      runButton.textContent = "Asking the LLM\u2026";
    }
    if (randomButton) randomButton.disabled = true;
    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mazeConfiguration)
      });
      const body = await response.json();
      if (!response.ok || "error" in body) {
        throw new Error("error" in body ? body.error : "Maze run failed.");
      }
      if (runButton) runButton.textContent = "Replaying\u2026";
      replay(
        body.trace,
        body.finalPosition,
        body.terminationReason === "action_limit" ? `Agent stopped after ${body.actionCount} actions` : void 0
      );
    } catch (cause) {
      const error = cause instanceof Error ? cause.message : String(cause);
      replay([], mazeConfiguration.start, error);
    }
  }
  runButton?.addEventListener("click", () => void runAgent());
  randomButton?.addEventListener("click", () => {
    if (replayTimer !== void 0) return;
    mazeConfiguration = generateRandomMaze();
    window.mazeVisualizer.configure(mazeConfiguration);
  });
  resetButton?.addEventListener("click", () => window.location.reload());
  window.mazeVisualizer.showMessage("Ready to run the LLM agent");
})();
