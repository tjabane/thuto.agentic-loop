import type { Position } from "../../04-maze-llm-agent/src/models/position.js";
import type {
    MazeConfiguration,
    MazeRunResponse,
    VisualDirection,
    VisualEvent,
} from "./types.js";

type MazeVisualizer = {
    move(direction: VisualDirection): boolean;
    takeKey(): boolean;
    unlockExit(): boolean;
    reset(): void;
    configure(config: MazeConfiguration): void;
    setState(state: {
        x: number;
        y: number;
        hasKey?: boolean;
        exitUnlocked?: boolean;
    }): void;
    showMessage(message: string): void;
    showBlockedMove(direction: string): void;
};

declare global {
    interface Window {
        mazeVisualizer: MazeVisualizer;
    }
}

let mazeConfiguration: MazeConfiguration = {
    rows: 3,
    columns: 3,
    blockedCells: [{ x: 1, y: 1 }],
    start: { x: 0, y: 0 },
    key: { x: 2, y: 0 },
    exit: { x: 2, y: 2 },
};

const runButton = document.getElementById(
    "autoButton",
) as HTMLButtonElement | null;
const randomButton = document.getElementById(
    "randomButton",
) as HTMLButtonElement | null;
const resetButton = document.getElementById(
    "resetButton",
) as HTMLButtonElement | null;
let replayTimer: number | undefined;

function makePositionKey(position: Position): string {
    return `${position.x},${position.y}`;
}

function positionsAreConnected(config: MazeConfiguration): boolean {
    const blocked = new Set(config.blockedCells.map(makePositionKey));
    const pending: Position[] = [config.start];
    const visited = new Set<string>([makePositionKey(config.start)]);
    const targets = new Set([
        makePositionKey(config.key),
        makePositionKey(config.exit),
    ]);
    const offsets: readonly [number, number][] = [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
    ];

    while (pending.length > 0) {
        const current = pending.shift();
        if (!current) break;
        targets.delete(makePositionKey(current));
        for (const [xOffset, yOffset] of offsets) {
            const neighbour = {
                x: current.x + xOffset,
                y: current.y + yOffset,
            };
            const key = makePositionKey(neighbour);
            if (
                neighbour.x >= 0 &&
                neighbour.x < config.columns &&
                neighbour.y >= 0 &&
                neighbour.y < config.rows &&
                !blocked.has(key) &&
                !visited.has(key)
            ) {
                visited.add(key);
                pending.push(neighbour);
            }
        }
    }
    return targets.size === 0;
}

function generateRandomMaze(): MazeConfiguration {
    const rows = 3;
    const columns = 3;
    const start = { x: 0, y: 0 };
    const positions = Array.from({ length: rows * columns }, (_, index) => ({
        x: index % columns,
        y: Math.floor(index / columns),
    })).filter(
        (position) => makePositionKey(position) !== makePositionKey(start),
    );

    while (true) {
        const shuffled = [...positions].sort(() => Math.random() - 0.5);
        const key = shuffled[0];
        const exit = shuffled[1];
        if (!key || !exit) continue;
        const blockedCells = shuffled.slice(
            2,
            2 + (Math.random() < 0.5 ? 1 : 2),
        );
        const candidate = {
            rows,
            columns,
            start,
            key,
            exit,
            blockedCells,
        };
        if (positionsAreConnected(candidate)) return candidate;
    }
}

function describe(event: VisualEvent): string {
    switch (event.type) {
        case "inspect":
            return `Inspecting (${event.position.x}, ${event.position.y})`;
        case "takeKey":
            return event.succeeded ? "Key collected" : "No key in this room";
        case "unlockExit":
            return event.succeeded
                ? "Exit unlocked"
                : "Exit could not be unlocked";
        case "exit":
            return event.succeeded
                ? "Agent escaped the maze"
                : "Agent did not escape";
        case "move":
            return event.succeeded
                ? `Moving ${event.direction}`
                : `Move ${event.direction} blocked`;
    }
}

function applyEvent(event: VisualEvent): void {
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

function replay(
    trace: VisualEvent[],
    finalPosition: Position,
    error?: string,
): void {
    let index = 0;
    window.mazeVisualizer.reset();
    const next = (): void => {
        const event = trace[index];
        if (event) {
            applyEvent(event);
            index += 1;
            replayTimer = window.setTimeout(next, 450);
            return;
        }
        replayTimer = undefined;
        window.mazeVisualizer.setState({
            x: finalPosition.x,
            y: finalPosition.y,
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

async function runAgent(): Promise<void> {
    if (replayTimer !== undefined) return;
    if (runButton) {
        runButton.disabled = true;
        runButton.textContent = "Asking the LLM…";
    }
    if (randomButton) randomButton.disabled = true;

    try {
        const response = await fetch("/api/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(mazeConfiguration),
        });
        const body = (await response.json()) as
            | MazeRunResponse
            | { error: string };
        if (!response.ok || "error" in body) {
            throw new Error("error" in body ? body.error : "Maze run failed.");
        }

        if (runButton) runButton.textContent = "Replaying…";
        replay(
            body.trace,
            body.finalPosition,
            body.terminationReason === "action_limit"
                ? `Agent stopped after ${body.actionCount} actions`
                : undefined,
        );
    } catch (cause) {
        const error = cause instanceof Error ? cause.message : String(cause);
        replay([], mazeConfiguration.start, error);
    }
}

runButton?.addEventListener("click", () => void runAgent());
randomButton?.addEventListener("click", () => {
    if (replayTimer !== undefined) return;
    mazeConfiguration = generateRandomMaze();
    window.mazeVisualizer.configure(mazeConfiguration);
});
resetButton?.addEventListener("click", () => window.location.reload());
window.mazeVisualizer.showMessage("Ready to run the LLM agent");
