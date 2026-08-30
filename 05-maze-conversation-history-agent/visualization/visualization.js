(() => {
  let mazeConfig = {
    rows: 3,
    columns: 3,
    blockedCells: [{ x: 1, y: 1 }],
    start: { x: 0, y: 0 },
    key: { x: 2, y: 0 },
    exit: { x: 2, y: 2 }
  };
  let blocked = new Set(["1,1"]);
  let state = createInitialState();

  const maze = document.getElementById("maze");
  const statusText = document.getElementById("statusText");
  const positionText = document.getElementById("positionText");
  const inventoryText = document.getElementById("inventoryText");
  const exitText = document.getElementById("exitText");
  const eventLog = document.getElementById("eventLog");
  const actionStream = document.getElementById("actionStream");
  let graph = { nodes: [], edges: [] };

  function createInitialState() {
    return { x: mazeConfig.start.x, y: mazeConfig.start.y, hasKey: false, exitUnlocked: false };
  }

  function cellKey(position) {
    return `${position.x},${position.y}`;
  }

  function buildMaze() {
    maze.replaceChildren();
    maze.style.gridTemplateColumns = `repeat(${mazeConfig.columns}, 1fr)`;
    maze.style.aspectRatio = `${mazeConfig.columns} / ${mazeConfig.rows}`;
    maze.setAttribute("aria-label", `${mazeConfig.rows} by ${mazeConfig.columns} maze`);

    for (let y = 0; y < mazeConfig.rows; y += 1) {
      for (let x = 0; x < mazeConfig.columns; x += 1) {
        const position = { x, y };
        const positionKey = cellKey(position);
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.x = String(x);
        cell.dataset.y = String(y);
        cell.innerHTML = `<span class="coordinate">${x}, ${y}</span>`;

        if (blocked.has(positionKey)) {
          cell.classList.add("blocked");
          cell.insertAdjacentHTML("beforeend", '<span class="blocked-mark">×</span><span class="label">Blocked</span>');
        } else if (positionKey === cellKey(mazeConfig.key)) {
          cell.classList.add("key-room");
          cell.insertAdjacentHTML("beforeend", '<span id="key" class="key" aria-label="Key">◆</span><span class="label">Key</span>');
        }

        if (positionKey === cellKey(mazeConfig.exit)) {
          cell.classList.add("exit-room");
          cell.insertAdjacentHTML("beforeend", '<span id="exit" class="exit" aria-label="Locked exit">▥</span><span class="label">Exit</span>');
        }
        if (positionKey === cellKey(mazeConfig.start)) {
          cell.classList.add("start");
          cell.insertAdjacentHTML("beforeend", '<span class="label">Start</span>');
        }
        maze.append(cell);
      }
    }

    const graphOverlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    graphOverlay.id = "graphOverlay";
    graphOverlay.setAttribute("viewBox", `0 0 ${mazeConfig.columns} ${mazeConfig.rows}`);
    graphOverlay.setAttribute("aria-hidden", "true");
    maze.append(graphOverlay);

    const agent = document.createElement("div");
    agent.id = "agent";
    agent.className = "agent";
    agent.innerHTML = '<span class="agent-eye left"></span><span class="agent-eye right"></span>';
    maze.append(agent);
    renderGraph();
  }

  function graphPosition(node) {
    const coordinates = /^([0-2]),([0-2])$/.exec(node);
    if (!coordinates) return undefined;
    return { x: Number(coordinates[1]) + .5, y: Number(coordinates[2]) + .5 };
  }

  function renderGraph() {
    const overlay = document.getElementById("graphOverlay");
    if (!overlay) return;
    overlay.replaceChildren();
    for (const edge of graph.edges) {
      if (!Array.isArray(edge) || edge.length !== 2) continue;
      const from = graphPosition(edge[0]);
      const to = graphPosition(edge[1]);
      if (!from || !to) continue;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(from.x));
      line.setAttribute("y1", String(from.y));
      line.setAttribute("x2", String(to.x));
      line.setAttribute("y2", String(to.y));
      line.classList.add("graph-edge");
      overlay.append(line);
    }
    for (const node of graph.nodes) {
      const position = graphPosition(node);
      if (!position) continue;
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", String(position.x));
      circle.setAttribute("cy", String(position.y));
      circle.setAttribute("r", ".09");
      circle.classList.add("graph-node");
      overlay.append(circle);
    }
  }

  function render() {
    const agent = document.getElementById("agent");
    const key = document.getElementById("key");
    const exit = document.getElementById("exit");
    const cellWidth = 100 / mazeConfig.columns;
    const cellHeight = 100 / mazeConfig.rows;
    agent.style.left = `calc(${state.x * cellWidth}% + (${cellWidth}% - ${agent.offsetWidth}px) / 2)`;
    agent.style.top = `calc(${state.y * cellHeight}% + (${cellHeight}% - ${agent.offsetHeight}px) / 2)`;
    agent.setAttribute("aria-label", `Agent at ${state.x}, ${state.y}`);
    positionText.textContent = `(${state.x}, ${state.y})`;
    inventoryText.textContent = state.hasKey ? "Key" : "Empty";
    exitText.textContent = state.exitUnlocked ? "Unlocked" : "Locked";
    key?.classList.toggle("collected", state.hasKey);
    exit?.classList.toggle("unlocked", state.exitUnlocked);
    if (exit) {
      exit.textContent = state.exitUnlocked ? "□" : "▥";
      exit.setAttribute("aria-label", state.exitUnlocked ? "Unlocked exit" : "Locked exit");
    }
  }

  function log(message) {
    const item = document.createElement("li");
    item.textContent = message;
    eventLog.prepend(item);
    while (eventLog.children.length > 6) eventLog.lastElementChild.remove();
  }

  function setStatus(message) {
    statusText.textContent = message;
  }

  function bump(message) {
    const agent = document.getElementById("agent");
    agent.classList.add("bump");
    window.setTimeout(() => agent.classList.remove("bump"), 220);
    setStatus(message);
    log(message);
  }

  function move(direction) {
    const offsets = {
      north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0]
    };
    const offset = offsets[direction];
    if (!offset) return false;
    const nextX = state.x + offset[0];
    const nextY = state.y + offset[1];
    const outside = nextX < 0 || nextX >= mazeConfig.columns || nextY < 0 || nextY >= mazeConfig.rows;
    if (outside || blocked.has(`${nextX},${nextY}`)) {
      bump(`Move ${direction}: blocked`);
      return false;
    }
    state.x = nextX;
    state.y = nextY;
    render();
    setStatus(`Moved ${direction}`);
    log(`Move ${direction} → (${nextX}, ${nextY})`);
    return true;
  }

  function takeKey() {
    if (state.x !== mazeConfig.key.x || state.y !== mazeConfig.key.y || state.hasKey) {
      setStatus("No key to take here");
      log("Take key: no change");
      return false;
    }
    state.hasKey = true;
    render();
    setStatus("Key collected");
    log("Take key → inventory updated");
    return true;
  }

  function unlockExit() {
    if (state.x !== mazeConfig.exit.x || state.y !== mazeConfig.exit.y || !state.hasKey) {
      setStatus("Cannot unlock exit");
      log("Unlock exit: requirements not met");
      return false;
    }
    state.exitUnlocked = true;
    render();
    setStatus("Exit unlocked");
    log("Unlock exit → success");
    return true;
  }

  function reset() {
    state = createInitialState();
    graph = { nodes: [], edges: [] };
    eventLog.replaceChildren();
    actionStream?.replaceChildren();
    render();
    setStatus("Ready");
    log("Visualization reset");
  }

  window.addEventListener("resize", render);

  window.mazeVisualizer = Object.freeze({
    move,
    takeKey,
    unlockExit,
    showMessage(message) {
      setStatus(message);
      log(message);
    },
    showBlockedMove(direction) {
      bump(`Move ${direction}: blocked`);
    },
    reset,
    configure(config) {
      mazeConfig = {
        ...config,
        blockedCells: config.blockedCells.map((cell) => ({ ...cell })),
        start: { ...config.start },
        key: { ...config.key },
        exit: { ...config.exit }
      };
      blocked = new Set(mazeConfig.blockedCells.map(cellKey));
      state = createInitialState();
      graph = { nodes: [], edges: [] };
      eventLog.replaceChildren();
      actionStream?.replaceChildren();
      buildMaze();
      render();
      setStatus("Random maze ready");
      log("Generated a new solvable maze");
    },
    setState(nextState) {
      state = { ...state, ...nextState };
      render();
    },
    updateGraph(nextGraph) {
      graph = {
        nodes: Array.isArray(nextGraph.nodes) ? [...nextGraph.nodes] : [],
        edges: Array.isArray(nextGraph.edges) ? nextGraph.edges.map((edge) => [...edge]) : []
      };
      renderGraph();
    },
    showAction(action) {
      if (!actionStream) return;
      const item = document.createElement("li");
      const title = document.createElement("strong");
      title.textContent = action.name;
      const details = document.createElement("span");
      const input = JSON.stringify(action.input);
      details.textContent = `${input} — ${action.result.message}`;
      item.classList.toggle("failed", !action.result.success);
      item.append(title, details);
      actionStream.append(item);
    },
    getState() {
      return { ...state };
    }
  });

  buildMaze();
  render();
  log("Visualization ready");
})();
