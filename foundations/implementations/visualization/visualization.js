(() => {
  "use strict";

  const SIZE = 3;
  const BLOCKED = new Set(["1,1"]);
  const initialState = Object.freeze({ x: 0, y: 0, hasKey: false, exitUnlocked: false });
  let state = { ...initialState };

  const agent = document.getElementById("agent");
  const key = document.getElementById("key");
  const exit = document.getElementById("exit");
  const statusText = document.getElementById("statusText");
  const positionText = document.getElementById("positionText");
  const inventoryText = document.getElementById("inventoryText");
  const exitText = document.getElementById("exitText");
  const eventLog = document.getElementById("eventLog");

  function render() {
    const cellWidth = 100 / SIZE;
    agent.style.left = `calc(${state.x * cellWidth}% + (${cellWidth}% - ${agent.offsetWidth}px) / 2)`;
    agent.style.top = `calc(${state.y * cellWidth}% + (${cellWidth}% - ${agent.offsetHeight}px) / 2)`;
    agent.setAttribute("aria-label", `Agent at ${state.x}, ${state.y}`);
    positionText.textContent = `(${state.x}, ${state.y})`;
    inventoryText.textContent = state.hasKey ? "Key" : "Empty";
    exitText.textContent = state.exitUnlocked ? "Unlocked" : "Locked";
    key.classList.toggle("collected", state.hasKey);
    exit.classList.toggle("unlocked", state.exitUnlocked);
    exit.textContent = state.exitUnlocked ? "▢" : "▥";
    exit.setAttribute("aria-label", state.exitUnlocked ? "Unlocked exit" : "Locked exit");
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
    const outside = nextX < 0 || nextX >= SIZE || nextY < 0 || nextY >= SIZE;
    if (outside || BLOCKED.has(`${nextX},${nextY}`)) {
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
    if (state.x !== 2 || state.y !== 0 || state.hasKey) {
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
    if (state.x !== 2 || state.y !== 2 || !state.hasKey) {
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
    state = { ...initialState };
    eventLog.replaceChildren();
    render();
    setStatus("Ready");
    log("Visualization reset");
  }

  window.addEventListener("resize", render);

  // Presentation-only API. Your agent can call these methods after each action.
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
    setState(nextState) {
      state = { ...state, ...nextState };
      render();
    },
    getState() {
      return { ...state };
    }
  });

  render();
  log("Visualization ready");
})();
