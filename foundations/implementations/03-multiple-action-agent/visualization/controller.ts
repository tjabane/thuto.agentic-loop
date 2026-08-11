import { agent, environment } from "../index.js";
import { Action, Direction, Position } from "../types.js";

type AgentSnapshot = {
    position: Position;
    hasKey: boolean;
    hasUnlockedExit: boolean;
    IsRunning: boolean;
};

type MazeVisualizer = {
    move(direction: "north" | "east" | "south" | "west"): boolean;
    takeKey(): boolean;
    unlockExit(): boolean;
    setState(state: { x: number; y: number; hasKey: boolean; exitUnlocked: boolean }): void;
    showMessage(message: string): void;
    showBlockedMove(direction: string): void;
};

declare global {
    interface Window {
        mazeVisualizer: MazeVisualizer;
    }
}

const visualDirections: Record<Direction, "north" | "east" | "south" | "west"> = {
    up: "north",
    right: "east",
    down: "south",
    left: "west",
};

function snapshot(): AgentSnapshot {
    return agent as unknown as AgentSnapshot;
}

function syncView(): void {
    const current = snapshot();
    window.mazeVisualizer.setState({
        x: current.position.x,
        y: current.position.y,
        hasKey: current.hasKey,
        exitUnlocked: current.hasUnlockedExit,
    });
}

function runAction(action: Action): void {
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

function thinkAndAct(): boolean {
    try {
        agent.InspectCell(environment);
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

document.querySelectorAll<HTMLButtonElement>("[data-direction]").forEach((button) => {
    button.addEventListener("click", () => {
        const directions: Record<string, Direction> = {
            north: "up",
            east: "right",
            south: "down",
            west: "left",
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

const autoButton = document.getElementById("autoButton") as HTMLButtonElement | null;
let autoTimer: number | undefined;
let automaticSteps = 0;

function stopAutomaticRun(message?: string): void {
    if (autoTimer !== undefined) window.clearTimeout(autoTimer);
    autoTimer = undefined;
    automaticSteps = 0;
    if (autoButton) autoButton.textContent = "Run agent";
    if (message) window.mazeVisualizer.showMessage(message);
}

function runAutomaticStep(): void {
    automaticSteps += 1;
    const succeeded = thinkAndAct();
    const current = snapshot();

    if (!succeeded || !current.IsRunning || automaticSteps >= 50) {
        const message = automaticSteps >= 50 ? "Automatic run stopped at 50 actions" : undefined;
        stopAutomaticRun(message);
        return;
    }

    autoTimer = window.setTimeout(runAutomaticStep, 700);
}

autoButton?.addEventListener("click", () => {
    if (autoTimer !== undefined) {
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
