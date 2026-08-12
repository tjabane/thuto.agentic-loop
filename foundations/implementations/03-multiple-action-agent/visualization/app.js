"use strict";
(() => {
  // foundations/implementations/03-multiple-action-agent/maze-utils.ts
  function makeCellKey(cell) {
    return `${cell.x},${cell.y}`;
  }

  // foundations/implementations/03-multiple-action-agent/agent.ts
  var Agent = class {
    position;
    ExistLocation;
    path;
    observations;
    blockedCells;
    moveHistory;
    hasKey;
    cellHasKey;
    cellIsLocked;
    isAtExist;
    hasExited;
    hasUnlockedExit;
    IsRunning;
    constructor(position, hasKey = false) {
      this.position = position;
      this.ExistLocation = { x: -1, y: -1 };
      this.path = [];
      this.moveHistory = [];
      this.observations = /* @__PURE__ */ new Set();
      this.blockedCells = /* @__PURE__ */ new Set();
      this.hasKey = hasKey;
      this.cellHasKey = false;
      this.cellIsLocked = false;
      this.isAtExist = false;
      this.hasExited = false;
      this.hasUnlockedExit = false;
      this.IsRunning = true;
    }
    observeCell(environment) {
      let currentCell = environment.viewCell(this.position);
      this.cellHasKey = currentCell.hasKey;
      this.cellIsLocked = currentCell.isUnlocked;
      this.isAtExist = currentCell.isExit;
      this.observations.add(currentCell);
      if (currentCell.isExit && !this.hasKey) {
        this.ExistLocation = currentCell.position;
      }
    }
    think() {
      if (this.hasKey && this.cellIsLocked && this.isAtExist) {
        return { type: "unlockExit" };
      }
      if (this.hasKey && this.isAtExist && !this.cellIsLocked) {
        return { type: "exit" };
      }
      if (!this.hasKey && this.cellHasKey) {
        return { type: "takeKey" };
      }
      return { type: "move", direction: this.getRandomDirection() };
    }
    getRandomDirection() {
      let directions = this.getValidDirections();
      let newPaths = this.getUnExploredCells(directions);
      if (newPaths.length > 0) {
        return newPaths[Math.floor(Math.random() * newPaths.length)];
      }
      if (directions.length === 0) {
        throw Error("No validate direction Available");
      } else {
        return directions[Math.floor(Math.random() * directions.length)];
      }
    }
    getValidDirections() {
      let directions = ["up", "down", "left", "right"];
      for (const direction of directions) {
        const neighbour = this.getNeighbour(direction);
        const isBlocked = this.blockedCells.has(makeCellKey(neighbour));
        if (isBlocked) {
          directions = directions.filter((candidate) => candidate !== direction);
        }
      }
      return directions;
    }
    getUnExploredCells(directions) {
      return directions.filter((direction) => {
        const neighbour = this.getNeighbour(direction);
        const hasSeen = this.path.some((past) => past.x === neighbour.x && past.y === neighbour.y);
        return !hasSeen;
      });
    }
    /**
     * Returns the position of the cell adjacent to the agent's current
     * position in the given direction.
     *
     * The grid's y axis grows downward, so `up` decrements y and `down`
     * increments it. No bounds or wall checking happens here — the returned
     * position may be outside the maze or blocked.
     *
     * @param direction - The direction to step in from the current position.
     * @returns The coordinates of the neighbouring cell.
     */
    getNeighbour(direction) {
      const currentPosition = this.position;
      const neighbours = {
        up: { x: currentPosition.x, y: currentPosition.y - 1 },
        down: { x: currentPosition.x, y: currentPosition.y + 1 },
        left: { x: currentPosition.x - 1, y: currentPosition.y },
        right: { x: currentPosition.x + 1, y: currentPosition.y }
      };
      return neighbours[direction];
    }
    performAction(action, environment) {
      switch (action.type) {
        case "move":
          if (action.direction) {
            this.Move(action.direction, environment);
          }
          break;
        case "takeKey":
          this.TakeKey(environment);
          break;
        case "unlockExit":
          this.UnlockExit(environment);
          break;
        case "exit":
          this.Exit(environment);
          break;
        default:
          console.log("Unknown action type");
      }
    }
    Run(enviroment) {
      while (this.IsRunning) {
        this.observeCell(enviroment);
        const action = this.think();
        this.performAction(action, enviroment);
      }
    }
    Move(direction, environment) {
      this.moveHistory.push({ position: this.position, direction });
      const newPosition = environment.changeAgentPosition(direction);
      if (newPosition.x !== -1 && newPosition.y !== -1) {
        console.log(`Moving ${direction} to position (${newPosition.x}, ${newPosition.y})`);
        this.position = newPosition;
        this.path.push(this.position);
      } else {
        console.log("Move blocked or out of bounds.");
        this.blockedCells.add(makeCellKey(this.getNeighbour(direction)));
      }
    }
    TakeKey(environment) {
      const keyCollected = environment.collectKey(this.position);
      if (keyCollected) {
        this.hasKey = true;
        console.log("Key collected!");
      }
    }
    UnlockExit(environment) {
      const exitUnlocked = environment.unlockExit(this.position);
      if (exitUnlocked) {
        this.hasUnlockedExit = true;
        console.log("Exit unlocked!");
      }
    }
    Exit(environment) {
      const hasExited = environment.agentExisted(this.position);
      if (hasExited) {
        this.hasExited = true;
        this.IsRunning = false;
        console.log("Agent has exited!");
      }
    }
  };

  // foundations/implementations/03-multiple-action-agent/enviroment.ts
  var Environment = class {
    maze;
    agentPosition;
    keyPosition;
    exitPosition;
    isKeyCollected;
    isExitLocked;
    constructor(numberOfRows, numberOfColumns, blockedCells, keyPosition, exitPosition, agentPosition = { x: 0, y: 0 }) {
      this.maze = Array(numberOfRows).fill(null).map(() => Array(numberOfColumns).fill(0));
      this.agentPosition = { ...agentPosition };
      this.keyPosition = keyPosition;
      this.exitPosition = exitPosition;
      this.isKeyCollected = false;
      this.isExitLocked = true;
      for (const cell of blockedCells) {
        this.maze[cell.y][cell.x] = 1;
      }
    }
    getAgentPostion() {
      return this.agentPosition;
    }
    getenviromentState() {
      return this.maze;
    }
    changeAgentPosition(direction) {
      if (direction === "up" && this.agentPosition.y > 0 && this.maze[this.agentPosition.y - 1][this.agentPosition.x] === 0) {
        this.agentPosition.y--;
      } else if (direction === "down" && this.agentPosition.y < this.maze.length - 1 && this.maze[this.agentPosition.y + 1][this.agentPosition.x] === 0) {
        this.agentPosition.y++;
      } else if (direction === "left" && this.agentPosition.x > 0 && this.maze[this.agentPosition.y][this.agentPosition.x - 1] === 0) {
        this.agentPosition.x--;
      } else if (direction === "right" && this.agentPosition.x < this.maze[0].length - 1 && this.maze[this.agentPosition.y][this.agentPosition.x + 1] === 0) {
        this.agentPosition.x++;
      } else
        return { x: -1, y: -1 };
      return { x: this.agentPosition.x, y: this.agentPosition.y };
    }
    collectKey(location) {
      if (this.keyPosition.x === location.x && this.keyPosition.y === location.y) {
        this.isKeyCollected = true;
        return true;
      }
      return false;
    }
    unlockExit(location) {
      if (this.exitPosition.x === location.x && this.exitPosition.y === location.y && this.isKeyCollected) {
        this.isExitLocked = false;
        return true;
      }
      return false;
    }
    agentExisted(location) {
      if (this.exitPosition.x === location.x && this.exitPosition.y === location.y && !this.isExitLocked) {
        return true;
      }
      return false;
    }
    viewCell(location) {
      return {
        position: location,
        isBlocked: this.maze[location.y][location.x] === 1,
        hasKey: this.keyPosition.x === location.x && this.keyPosition.y === location.y && !this.isKeyCollected,
        isExit: this.exitPosition.x === location.x && this.exitPosition.y === location.y,
        isUnlocked: this.isExitLocked
      };
    }
  };

  // foundations/implementations/03-multiple-action-agent/visualization/controller.ts
  var START = { x: 0, y: 0 };
  var KEY = { x: 2, y: 0 };
  var EXIT = { x: 2, y: 2 };
  var BLOCKED = [{ x: 1, y: 1 }];
  var ACTION_LIMIT = 50;
  var visualDirections = {
    up: "north",
    right: "east",
    down: "south",
    left: "west"
  };
  var TracingEnvironment = class extends Environment {
    trace = [];
    actions = 0;
    viewCell(position) {
      this.trace.push({ type: "inspect", position: { ...position } });
      return super.viewCell(position);
    }
    changeAgentPosition(direction) {
      this.guardLimit();
      const result = super.changeAgentPosition(direction);
      this.trace.push({
        type: "move",
        direction: visualDirections[direction],
        succeeded: result.x !== -1 && result.y !== -1
      });
      return result;
    }
    collectKey(position) {
      this.guardLimit();
      const succeeded = super.collectKey(position);
      this.trace.push({ type: "takeKey", succeeded });
      return succeeded;
    }
    unlockExit(position) {
      this.guardLimit();
      const succeeded = super.unlockExit(position);
      this.trace.push({ type: "unlockExit", succeeded });
      return succeeded;
    }
    agentExisted(position) {
      this.guardLimit();
      const succeeded = super.agentExisted(position);
      this.trace.push({ type: "exit", succeeded });
      return succeeded;
    }
    guardLimit() {
      this.actions += 1;
      if (this.actions > ACTION_LIMIT) throw new Error(`Stopped after ${ACTION_LIMIT} actions`);
    }
  };
  var runButton = document.getElementById("autoButton");
  var resetButton = document.getElementById("resetButton");
  var replayTimer;
  function describe(event) {
    switch (event.type) {
      case "inspect":
        return `Inspecting (${event.position.x}, ${event.position.y})`;
      case "takeKey":
        return event.succeeded ? "Key collected" : "No key in this room";
      case "unlockExit":
        return event.succeeded ? "Exit unlocked" : "Exit could not be unlocked";
      case "exit":
        return event.succeeded ? "Agent escaped the maze" : "No open exit here";
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
      window.mazeVisualizer.setState({ x: finalPosition.x, y: finalPosition.y });
      if (error) window.mazeVisualizer.showMessage(error);
      if (runButton) {
        runButton.disabled = false;
        runButton.textContent = "Run agent";
      }
    };
    next();
  }
  function runAgent() {
    if (replayTimer !== void 0) return;
    if (runButton) {
      runButton.disabled = true;
      runButton.textContent = "Planning\u2026";
    }
    window.setTimeout(() => {
      const environment = new TracingEnvironment(3, 3, BLOCKED, KEY, EXIT, START);
      const agent = new Agent(START);
      let error;
      try {
        agent.Run(environment);
      } catch (cause) {
        error = cause instanceof Error ? cause.message : String(cause);
      }
      if (runButton) runButton.textContent = "Replaying\u2026";
      replay(environment.trace, environment.getAgentPostion(), error);
    }, 0);
  }
  runButton?.addEventListener("click", runAgent);
  resetButton?.addEventListener("click", () => window.location.reload());
  window.mazeVisualizer.showMessage("Ready to run the TypeScript agent");
})();
