"use strict";
(() => {
  // foundations/implementations/03-multiple-action-agent/agent.ts
  var Agent = class _Agent {
    position;
    path;
    observations;
    blockedCells;
    moveHistory;
    hasKey;
    cellHasKey;
    cellIsLocked;
    hasExited;
    isAtExist;
    hasUnlockedExit;
    IsRunning;
    constructor(position) {
      this.position = position;
      this.path = [];
      this.moveHistory = [];
      this.observations = /* @__PURE__ */ new Set();
      this.blockedCells = /* @__PURE__ */ new Set();
      this.hasKey = false;
      this.cellHasKey = false;
      this.cellIsLocked = false;
      this.hasExited = false;
      this.isAtExist = false;
      this.hasUnlockedExit = false;
      this.IsRunning = true;
    }
    InspectCell(environment2) {
      if (_Agent.hasBeenHereBefore(this.position, this.observations))
        return;
      let currentCell = environment2.viewCell(this.position);
      this.hasKey = currentCell.hasKey;
      this.cellIsLocked = currentCell.isUnlocked;
      this.isAtExist = currentCell.isExit;
      this.path.push(this.position);
      this.observations.add(currentCell);
    }
    static hasBeenHereBefore(currentPosition, pastPositions) {
      return [...pastPositions].some((seen) => seen.position.x === currentPosition.x && seen.position.y === currentPosition.y);
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
      let directions = ["up", "down", "left", "right"];
      for (const direction in directions) {
        if (this.moveHistory.length > 0) {
          const lastMove = this.moveHistory[this.moveHistory.length - 1];
          if (lastMove?.direction === direction && this.position === lastMove?.position) {
            directions = directions.splice(directions.indexOf(direction), 1);
          }
        }
        const gotoDirection = directions[Math.floor(Math.random() * directions.length)];
        console.log(`next random direction ${gotoDirection}`);
        return gotoDirection;
      }
      throw Error("No validate direction Available");
    }
    ActOnAction(action, environment2) {
      switch (action.type) {
        case "move":
          if (action.direction) {
            this.Move(action.direction, environment2);
          }
          break;
        case "takeKey":
          this.TakeKey(environment2);
          break;
        case "unlockExit":
          this.UnlockExit(environment2);
          break;
        case "exit":
          this.Exit(environment2);
          break;
        default:
          console.log("Unknown action type");
      }
    }
    Move(direction, environment2) {
      this.moveHistory.push({ position: this.position, direction });
      const newPosition = environment2.changeAgentPosition(direction);
      if (newPosition.x !== -1 && newPosition.y !== -1) {
        console.log(`Moving ${direction} to position (${newPosition.x}, ${newPosition.y})`);
        this.position = newPosition;
      } else {
        console.log("Move blocked or out of bounds.");
        this.blockedCells.add(this.position);
      }
    }
    TakeKey(environment2) {
      const keyCollected = environment2.collectKey(this.position);
      if (keyCollected) {
        this.hasKey = true;
        console.log("Key collected!");
      }
    }
    UnlockExit(environment2) {
      const exitUnlocked = environment2.unlockExit(this.position);
      if (exitUnlocked) {
        this.hasUnlockedExit = true;
        console.log("Exit unlocked!");
      }
    }
    Exit(environment2) {
      const hasExited = environment2.agentExisted(this.position);
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
    constructor(numberOfRows, numberOfColumns, blockedCells2, keyPosition2, exitPosition2) {
      this.maze = Array(numberOfRows).fill(null).map(() => Array(numberOfColumns).fill(0));
      this.agentPosition = { x: 0, y: 0 };
      this.keyPosition = keyPosition2;
      this.exitPosition = exitPosition2;
      this.isKeyCollected = false;
      this.isExitLocked = true;
      for (const cell of blockedCells2) {
        this.maze[cell.y][cell.x] = 1;
      }
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
    getAgentPostion() {
      return this.agentPosition;
    }
  };

  // foundations/implementations/03-multiple-action-agent/index.ts
  var startPosition = { x: 0, y: 0 };
  var blockedCells = [{ x: 1, y: 1 }];
  var keyPosition = { x: 2, y: 0 };
  var exitPosition = { x: 2, y: 2 };
  var environment = new Environment(
    3,
    3,
    blockedCells,
    keyPosition,
    exitPosition
  );
  var agent = new Agent(startPosition);

  // foundations/implementations/03-multiple-action-agent/visualization/controller.ts
  var visualDirections = {
    up: "north",
    right: "east",
    down: "south",
    left: "west"
  };
  function snapshot() {
    return agent;
  }
  function syncView() {
    const current = snapshot();
    window.mazeVisualizer.setState({
      x: current.position.x,
      y: current.position.y,
      hasKey: current.hasKey,
      exitUnlocked: current.hasUnlockedExit
    });
  }
  function runAction(action) {
    const before = snapshot().position;
    agent.ActOnAction(action, environment);
    const after = snapshot().position;
    if (action.type === "move" && action.direction) {
      if (before.x === after.x && before.y === after.y) {
        window.mazeVisualizer.showBlockedMove(visualDirections[action.direction]);
      } else {
        window.mazeVisualizer.move(visualDirections[action.direction]);
      }
    }
    syncView();
  }
  function thinkAndAct() {
    try {
      const action = agent.think();
      window.mazeVisualizer.showMessage(`Agent chose: ${action.type}`);
      runAction(action);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.mazeVisualizer.showMessage(`Agent error: ${message}`);
      return false;
    }
  }
  document.querySelectorAll("[data-direction]").forEach((button) => {
    button.addEventListener("click", () => {
      const directions = {
        north: "up",
        east: "right",
        south: "down",
        west: "left"
      };
      const direction = directions[button.dataset.direction ?? ""];
      if (direction) runAction({ type: "move", direction });
    });
  });
  document.getElementById("inspectButton")?.addEventListener("click", () => {
    agent.InspectCell(environment);
    window.mazeVisualizer.showMessage("Agent inspected the current cell");
    syncView();
  });
  document.getElementById("thinkButton")?.addEventListener("click", () => {
    thinkAndAct();
  });
  var autoButton = document.getElementById("autoButton");
  var autoTimer;
  var automaticSteps = 0;
  function stopAutomaticRun(message) {
    if (autoTimer !== void 0) window.clearTimeout(autoTimer);
    autoTimer = void 0;
    automaticSteps = 0;
    if (autoButton) autoButton.textContent = "Run agent";
    if (message) window.mazeVisualizer.showMessage(message);
  }
  function runAutomaticStep() {
    automaticSteps += 1;
    const succeeded = thinkAndAct();
    const current = snapshot();
    if (!succeeded || !current.IsRunning || automaticSteps >= 50) {
      const message = automaticSteps >= 50 ? "Automatic run stopped at 50 actions" : void 0;
      stopAutomaticRun(message);
      return;
    }
    autoTimer = window.setTimeout(runAutomaticStep, 700);
  }
  autoButton?.addEventListener("click", () => {
    if (autoTimer !== void 0) {
      stopAutomaticRun("Automatic run stopped");
      return;
    }
    autoButton.textContent = "Stop agent";
    window.mazeVisualizer.showMessage("Automatic run started");
    runAutomaticStep();
  });
  document.getElementById("takeButton")?.addEventListener("click", () => {
    runAction({ type: "takeKey" });
  });
  document.getElementById("unlockButton")?.addEventListener("click", () => {
    runAction({ type: "unlockExit" });
  });
  document.getElementById("resetButton")?.addEventListener("click", () => {
    stopAutomaticRun();
    window.location.reload();
  });
  syncView();
  window.mazeVisualizer.showMessage("Connected to the TypeScript agent and environment");
})();
