"use strict";
(() => {
  // maze-exploration-agent/support/maze-utils.ts
  function makeCellKey(cell) {
    return `${cell.x},${cell.y}`;
  }

  // maze-exploration-agent/support/route-planner.ts
  var DIRECTIONS = ["up", "down", "left", "right"];
  var TraversalRoutePlanner = class {
    /**
     * Lists directions that have not yet been attempted from a traversal node.
     *
     * @param node - Discovered cell to inspect.
     * @returns Untried directions in deterministic cardinal-direction order.
     */
    getUntriedDirections(node) {
      return DIRECTIONS.filter((direction) => !node.attemptedDirections.has(direction));
    }
    /**
     * Finds the shortest known route to a cell that still has an untried direction.
     *
     * @param traversalMap - Graph of cells discovered by the agent.
     * @param start - Position from which to begin the search.
     * @returns Movement directions to the nearest explorable cell, or `undefined`
     * when none is reachable through the known graph.
     */
    findRouteToNearestExplorableNode(traversalMap, start) {
      return this.findShortestRoute(
        traversalMap,
        start,
        (node) => this.getUntriedDirections(node).length > 0
      );
    }
    /**
     * Finds the shortest known route between two maze positions.
     *
     * @param traversalMap - Graph of cells discovered by the agent.
     * @param start - Position from which to begin the search.
     * @param destination - Position the route must reach.
     * @returns Movement directions to the destination, an empty array when already
     * there, or `undefined` when no known route exists.
     */
    findRouteToPosition(traversalMap, start, destination) {
      const destinationKey = makeCellKey(destination);
      if (makeCellKey(start) === destinationKey) {
        return [];
      }
      return this.findShortestRoute(
        traversalMap,
        start,
        (node) => makeCellKey(node.position) === destinationKey
      );
    }
    findShortestRoute(traversalMap, start, isGoal) {
      const startKey = makeCellKey(start);
      const queue = [{ ...start }];
      const visited = /* @__PURE__ */ new Set([startKey]);
      const previous = /* @__PURE__ */ new Map();
      while (queue.length > 0) {
        const current = queue.shift();
        if (!current) {
          break;
        }
        const currentKey = makeCellKey(current);
        const currentNode = traversalMap.get(currentKey);
        if (!currentNode) {
          continue;
        }
        if (currentKey !== startKey && isGoal(currentNode)) {
          return this.reconstructRoute(startKey, currentKey, previous);
        }
        for (const direction of DIRECTIONS) {
          const neighbour = currentNode.neighbours[direction];
          if (!neighbour) {
            continue;
          }
          const neighbourKey = makeCellKey(neighbour);
          if (visited.has(neighbourKey)) {
            continue;
          }
          visited.add(neighbourKey);
          previous.set(neighbourKey, { position: current, direction });
          queue.push(neighbour);
        }
      }
      return void 0;
    }
    reconstructRoute(startKey, goalKey, previous) {
      const route = [];
      let currentKey = goalKey;
      while (currentKey !== startKey) {
        const step = previous.get(currentKey);
        if (!step) {
          return [];
        }
        route.unshift(step.direction);
        currentKey = makeCellKey(step.position);
      }
      return route;
    }
  };

  // maze-exploration-agent/agent.ts
  var Agent = class _Agent {
    static MAX_ACTIONS = 25;
    position;
    ExistLocation;
    path;
    observations;
    blockedCells;
    traversalMap;
    moveHistory;
    hasKey;
    cellHasKey;
    cellIsUnlocked;
    isAtExist;
    IsRunning;
    phase;
    plannedRoute;
    actionCount;
    terminationReason;
    routePlanner;
    /**
     * Creates an agent at the supplied starting position.
     *
     * @param position - Initial maze coordinates.
     * @param hasKey - Whether the agent starts with the key.
     * @param routePlanner - Planner used to navigate the discovered traversal graph.
     */
    constructor(position, hasKey = false, routePlanner = new TraversalRoutePlanner()) {
      this.position = position;
      this.ExistLocation = { x: -1, y: -1 };
      this.path = [position];
      this.moveHistory = [];
      this.observations = /* @__PURE__ */ new Set();
      this.blockedCells = /* @__PURE__ */ new Set();
      this.traversalMap = /* @__PURE__ */ new Map();
      this.traversalMap.set(makeCellKey(position), this.createTraversalNode(position));
      this.hasKey = hasKey;
      this.cellHasKey = false;
      this.cellIsUnlocked = false;
      this.isAtExist = false;
      this.IsRunning = true;
      this.phase = "explore";
      this.plannedRoute = [];
      this.actionCount = 0;
      this.terminationReason = void 0;
      this.routePlanner = routePlanner;
    }
    createTraversalNode(position) {
      return {
        position: { ...position },
        neighbours: {},
        attemptedDirections: /* @__PURE__ */ new Set(),
        blockedDirections: /* @__PURE__ */ new Set(),
        isExit: false
      };
    }
    getOrCreateTraversalNode(position) {
      const key = makeCellKey(position);
      const existingNode = this.traversalMap.get(key);
      if (existingNode) {
        return existingNode;
      }
      const node = this.createTraversalNode(position);
      this.traversalMap.set(key, node);
      return node;
    }
    updatePhase() {
      if (this.hasKey && this.ExistLocation.x !== -1 && this.ExistLocation.y !== -1) {
        if (this.phase !== "exploit") {
          this.phase = "exploit";
          this.plannedRoute = [];
        }
      }
    }
    observeCell(environment) {
      const currentCell = environment.viewCurrentCell();
      this.cellHasKey = currentCell.hasKey;
      this.cellIsUnlocked = currentCell.isUnlocked;
      this.isAtExist = currentCell.isExit;
      this.observations.add(currentCell);
      const currentNode = this.getOrCreateTraversalNode(currentCell.position);
      currentNode.isExit = currentCell.isExit;
      if (currentCell.isExit) {
        this.ExistLocation = { ...currentCell.position };
        this.updatePhase();
      }
    }
    think() {
      if (this.hasKey && !this.cellIsUnlocked && this.isAtExist) {
        return { type: "unlockExit" };
      }
      if (this.hasKey && this.isAtExist && this.cellIsUnlocked) {
        return { type: "exit" };
      }
      if (!this.hasKey && this.cellHasKey) {
        return { type: "takeKey" };
      }
      const direction = this.getDirection();
      return direction ? { type: "move", direction } : void 0;
    }
    getDirection() {
      if (this.plannedRoute.length > 0) {
        return this.plannedRoute.shift();
      }
      if (this.phase === "exploit") {
        this.plannedRoute = this.routePlanner.findRouteToPosition(
          this.traversalMap,
          this.position,
          this.ExistLocation
        ) ?? [];
        return this.plannedRoute.shift();
      }
      const currentNode = this.getOrCreateTraversalNode(this.position);
      const untriedDirections = this.routePlanner.getUntriedDirections(currentNode);
      if (untriedDirections.length > 0) {
        return untriedDirections[Math.floor(Math.random() * untriedDirections.length)];
      }
      this.plannedRoute = this.routePlanner.findRouteToNearestExplorableNode(
        this.traversalMap,
        this.position
      ) ?? [];
      return this.plannedRoute.shift();
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
    /**
     * Runs the perceive-think-act loop until the agent exits, cannot find another
     * action, or reaches its safety limit.
     *
     * @param environment - Maze environment to observe and act upon.
     */
    Run(environment) {
      while (this.IsRunning) {
        this.observeCell(environment);
        if (this.actionCount >= _Agent.MAX_ACTIONS) {
          this.finish("safety_limit");
          break;
        }
        const action = this.think();
        if (!action) {
          this.finish("unreachable");
          break;
        }
        this.performAction(action, environment);
        this.actionCount++;
      }
    }
    finish(reason) {
      this.IsRunning = false;
      this.phase = "finished";
      this.terminationReason = reason;
      this.plannedRoute = [];
    }
    Move(direction, environment) {
      const previousPosition = this.position;
      const previousNode = this.getOrCreateTraversalNode(previousPosition);
      previousNode.attemptedDirections.add(direction);
      this.moveHistory.push({ position: this.position, direction });
      const newPosition = environment.changeAgentPosition(direction);
      if (newPosition.x !== -1 && newPosition.y !== -1) {
        console.log(`Moving ${direction} to position (${newPosition.x}, ${newPosition.y})`);
        this.position = newPosition;
        this.path.push(this.position);
        const newNode = this.getOrCreateTraversalNode(newPosition);
        previousNode.neighbours[direction] = { ...newPosition };
        const oppositeDirection = this.getOppositeDirection(direction);
        newNode.neighbours[oppositeDirection] = { ...previousPosition };
        newNode.attemptedDirections.add(oppositeDirection);
      } else {
        console.log("Move blocked or out of bounds.");
        this.blockedCells.add(makeCellKey(this.getNeighbour(direction)));
        previousNode.blockedDirections.add(direction);
        this.plannedRoute = [];
      }
    }
    getOppositeDirection(direction) {
      const opposites = {
        up: "down",
        down: "up",
        left: "right",
        right: "left"
      };
      return opposites[direction];
    }
    TakeKey(environment) {
      const keyCollected = environment.collectKey();
      if (keyCollected) {
        this.hasKey = true;
        this.updatePhase();
        console.log("Key collected!");
      }
    }
    UnlockExit(environment) {
      const exitUnlocked = environment.unlockExit();
      if (exitUnlocked) {
        console.log("Exit unlocked!");
      }
    }
    Exit(environment) {
      const hasExited = environment.agentExited();
      if (hasExited) {
        this.finish("success");
        console.log("Agent has exited!");
      }
    }
    /** @returns The agent's current strategy phase. */
    getPhase() {
      return this.phase;
    }
    /**
     * @returns A copy of the discovered exit position, or `undefined` if the exit
     * has not yet been observed.
     */
    getExitLocation() {
      if (this.ExistLocation.x === -1 || this.ExistLocation.y === -1) {
        return void 0;
      }
      return { ...this.ExistLocation };
    }
    /**
     * Gets a defensive copy of the traversal knowledge for a cell.
     *
     * @param position - Coordinates of the node to retrieve.
     * @returns The copied node, or `undefined` when the cell has not been discovered.
     */
    getTraversalNode(position) {
      const node = this.traversalMap.get(makeCellKey(position));
      if (!node) {
        return void 0;
      }
      return {
        position: { ...node.position },
        neighbours: { ...node.neighbours },
        attemptedDirections: new Set(node.attemptedDirections),
        blockedDirections: new Set(node.blockedDirections),
        isExit: node.isExit
      };
    }
    /** @returns Why the run stopped, or `undefined` while it has not terminated. */
    getTerminationReason() {
      return this.terminationReason;
    }
    /** @returns The number of actions performed during the run. */
    getActionCount() {
      return this.actionCount;
    }
  };

  // maze-exploration-agent/environment.ts
  var Environment = class {
    maze;
    agentPosition;
    keyPosition;
    exitPosition;
    isKeyCollected = false;
    isExitLocked = true;
    /**
     * Creates a rectangular maze environment.
     *
     * @param numberOfRows - Positive integer height of the maze.
     * @param numberOfColumns - Positive integer width of the maze.
     * @param blockedCells - In-bounds cells through which the agent cannot move.
     * @param keyPosition - In-bounds, traversable location of the key.
     * @param exitPosition - In-bounds, traversable location of the exit.
     * @param agentPosition - Initial in-bounds, traversable agent location.
     * @throws {@link RangeError} When dimensions or positions are invalid.
     * @throws {@link Error} When the agent, key, or exit is on a blocked cell.
     */
    constructor(numberOfRows, numberOfColumns, blockedCells, keyPosition, exitPosition, agentPosition = { x: 0, y: 0 }) {
      this.validateDimensions(numberOfRows, numberOfColumns);
      this.validatePosition(agentPosition, numberOfRows, numberOfColumns, "Agent");
      this.validatePosition(keyPosition, numberOfRows, numberOfColumns, "Key");
      this.validatePosition(exitPosition, numberOfRows, numberOfColumns, "Exit");
      for (const blockedCell of blockedCells) {
        this.validatePosition(blockedCell, numberOfRows, numberOfColumns, "Blocked cell");
      }
      const blockedKeys = new Set(blockedCells.map((cell) => this.makePositionKey(cell)));
      this.assertNotBlocked(agentPosition, blockedKeys, "Agent");
      this.assertNotBlocked(keyPosition, blockedKeys, "Key");
      this.assertNotBlocked(exitPosition, blockedKeys, "Exit");
      this.maze = Array.from(
        { length: numberOfRows },
        () => Array(numberOfColumns).fill(0)
      );
      for (const cell of blockedCells) {
        const row = this.maze[cell.y];
        if (row) {
          row[cell.x] = 1;
        }
      }
      this.agentPosition = { ...agentPosition };
      this.keyPosition = { ...keyPosition };
      this.exitPosition = { ...exitPosition };
    }
    /** @returns A copy of the agent's current position. */
    getAgentPosition() {
      return { ...this.agentPosition };
    }
    /**
     * Attempts to move the agent one cell in a cardinal direction.
     *
     * @param direction - Direction in which to move.
     * @returns The new position, or the sentinel `{-1, -1}` when movement is blocked
     * or would leave the maze.
     */
    changeAgentPosition(direction) {
      const candidate = this.getNeighbour(this.agentPosition, direction);
      if (!this.isTraversable(candidate)) {
        return { x: -1, y: -1 };
      }
      this.agentPosition = candidate;
      return { ...this.agentPosition };
    }
    /**
     * Collects the key when the agent currently occupies its cell.
     *
     * @returns `true` only when this call collected the key.
     */
    collectKey() {
      if (this.isKeyCollected || !this.positionsMatch(this.agentPosition, this.keyPosition)) {
        return false;
      }
      this.isKeyCollected = true;
      return true;
    }
    /**
     * Unlocks the exit when the agent is at the exit and has collected the key.
     *
     * @returns `true` only when this call unlocked the exit.
     */
    unlockExit() {
      if (!this.isExitLocked || !this.isKeyCollected || !this.positionsMatch(this.agentPosition, this.exitPosition)) {
        return false;
      }
      this.isExitLocked = false;
      return true;
    }
    /** @returns Whether the agent currently occupies an unlocked exit. */
    agentExited() {
      return this.positionsMatch(this.agentPosition, this.exitPosition) && !this.isExitLocked;
    }
    /** @returns A snapshot describing the cell currently occupied by the agent. */
    viewCurrentCell() {
      return {
        position: { ...this.agentPosition },
        isBlocked: false,
        hasKey: this.positionsMatch(this.agentPosition, this.keyPosition) && !this.isKeyCollected,
        isExit: this.positionsMatch(this.agentPosition, this.exitPosition),
        isUnlocked: this.positionsMatch(this.agentPosition, this.exitPosition) && !this.isExitLocked
      };
    }
    validateDimensions(numberOfRows, numberOfColumns) {
      if (!Number.isInteger(numberOfRows) || !Number.isInteger(numberOfColumns) || numberOfRows <= 0 || numberOfColumns <= 0) {
        throw new RangeError("Maze dimensions must be positive integers");
      }
    }
    validatePosition(position, numberOfRows, numberOfColumns, label) {
      if (!Number.isInteger(position.x) || !Number.isInteger(position.y) || position.x < 0 || position.x >= numberOfColumns || position.y < 0 || position.y >= numberOfRows) {
        throw new RangeError(`${label} position is outside the maze`);
      }
    }
    assertNotBlocked(position, blockedKeys, label) {
      if (blockedKeys.has(this.makePositionKey(position))) {
        throw new Error(`${label} position cannot be blocked`);
      }
    }
    getNeighbour(position, direction) {
      const offsets = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 }
      };
      const offset = offsets[direction];
      return { x: position.x + offset.x, y: position.y + offset.y };
    }
    isTraversable(position) {
      const row = this.maze[position.y];
      return row !== void 0 && row[position.x] === 0;
    }
    positionsMatch(left, right) {
      return left.x === right.x && left.y === right.y;
    }
    makePositionKey(position) {
      return `${position.x},${position.y}`;
    }
  };

  // visualization/controller.ts
  var mazeConfiguration = {
    rows: 3,
    columns: 3,
    blockedCells: [{ x: 1, y: 1 }],
    start: { x: 0, y: 0 },
    key: { x: 2, y: 0 },
    exit: { x: 2, y: 2 }
  };
  var visualDirections = {
    up: "north",
    right: "east",
    down: "south",
    left: "west"
  };
  var TracingEnvironment = class extends Environment {
    trace = [];
    viewCurrentCell() {
      const position = this.getAgentPosition();
      this.trace.push({ type: "inspect", position: { ...position } });
      return super.viewCurrentCell();
    }
    changeAgentPosition(direction) {
      const result = super.changeAgentPosition(direction);
      this.trace.push({
        type: "move",
        direction: visualDirections[direction],
        succeeded: result.x !== -1 && result.y !== -1
      });
      return result;
    }
    collectKey() {
      const succeeded = super.collectKey();
      this.trace.push({ type: "takeKey", succeeded });
      return succeeded;
    }
    unlockExit() {
      const succeeded = super.unlockExit();
      this.trace.push({ type: "unlockExit", succeeded });
      return succeeded;
    }
    agentExited() {
      const succeeded = super.agentExited();
      this.trace.push({ type: "exit", succeeded });
      return succeeded;
    }
  };
  var runButton = document.getElementById("autoButton");
  var randomButton = document.getElementById("randomButton");
  var resetButton = document.getElementById("resetButton");
  var replayTimer;
  function makePositionKey(position) {
    return `${position.x},${position.y}`;
  }
  function positionsAreConnected(config) {
    const blocked = new Set(config.blockedCells.map(makePositionKey));
    const pending = [config.start];
    const visited = /* @__PURE__ */ new Set([makePositionKey(config.start)]);
    const targets = /* @__PURE__ */ new Set([makePositionKey(config.key), makePositionKey(config.exit)]);
    const offsets = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    while (pending.length > 0) {
      const current = pending.shift();
      if (!current) break;
      targets.delete(makePositionKey(current));
      for (const [xOffset, yOffset] of offsets) {
        const neighbour = { x: current.x + xOffset, y: current.y + yOffset };
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
    })).filter((position) => makePositionKey(position) !== makePositionKey(start));
    while (true) {
      const shuffled = [...positions].sort(() => Math.random() - 0.5);
      const key = shuffled[0];
      const exit = shuffled[1];
      if (!key || !exit) continue;
      const blockedCells = shuffled.slice(2, 2 + (Math.random() < 0.5 ? 1 : 2));
      const candidate = { rows, columns, start, key, exit, blockedCells };
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
      if (randomButton) randomButton.disabled = false;
    };
    next();
  }
  function runAgent() {
    if (replayTimer !== void 0) return;
    if (runButton) {
      runButton.disabled = true;
      runButton.textContent = "Planning\u2026";
    }
    if (randomButton) randomButton.disabled = true;
    window.setTimeout(() => {
      const { rows, columns, blockedCells, key, exit, start } = mazeConfiguration;
      const environment = new TracingEnvironment(rows, columns, blockedCells, key, exit, start);
      const agent = new Agent(start);
      let error;
      try {
        agent.Run(environment);
      } catch (cause) {
        error = cause instanceof Error ? cause.message : String(cause);
      }
      if (runButton) runButton.textContent = "Replaying\u2026";
      replay(environment.trace, environment.getAgentPosition(), error);
    }, 0);
  }
  runButton?.addEventListener("click", runAgent);
  randomButton?.addEventListener("click", () => {
    if (replayTimer !== void 0) return;
    mazeConfiguration = generateRandomMaze();
    window.mazeVisualizer.configure(mazeConfiguration);
  });
  resetButton?.addEventListener("click", () => window.location.reload());
  window.mazeVisualizer.showMessage("Ready to run the TypeScript agent");
})();
