import type { Position } from "../src/models/position.js";
import type {
    MazeConfiguration,
    MazeRunResponse,
    VisualAction,
} from "./types.js";

type MazeVisualizer = {
    move(direction: "north" | "east" | "south" | "west"): boolean;
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
    updateGraph(graph: VisualAction["graph"]): void;
    showAction(action: VisualAction): void;
};

let mazeConfiguration: MazeConfiguration = {
    rows: 3,
    columns: 3,
    blockedCells: [{ x: 1, y: 1 }],
    start: { x: 0, y: 0 },
    key: { x: 2, y: 0 },
    exit: { x: 2, y: 2 },
};
const mazeVisualizer = window.mazeVisualizer as unknown as MazeVisualizer;

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
    const rows = 3 as const;
    const columns = 3 as const;
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

function applyAction(action: VisualAction): void {
    const direction = action.result.data?.direction;
    if (action.name === "move" && typeof direction === "string") {
        const visualDirection = toVisualDirection(direction);
        if (visualDirection !== undefined) {
            if (action.result.success) mazeVisualizer.move(visualDirection);
            else mazeVisualizer.showBlockedMove(visualDirection);
        }
    } else if (action.name === "take_key" && action.result.success) {
        mazeVisualizer.takeKey();
    } else if (action.name === "unlock_exit" && action.result.success) {
        mazeVisualizer.unlockExit();
    }
    mazeVisualizer.updateGraph(action.graph);
    mazeVisualizer.showAction(action);
    mazeVisualizer.showMessage(action.result.message);
}

function toVisualDirection(direction: string): "north" | "east" | "south" | "west" | undefined {
    switch (direction) {
        case "up":
            return "north";
        case "right":
            return "east";
        case "down":
            return "south";
        case "left":
            return "west";
        default:
            return undefined;
    }
}

function replay(
    trace: readonly VisualAction[],
    finalPosition: Position,
    error?: string,
): void {
    let index = 0;
    mazeVisualizer.reset();
    const next = (): void => {
        const action = trace[index];
        if (action) {
            applyAction(action);
            index += 1;
            replayTimer = window.setTimeout(next, 450);
            return;
        }
        replayTimer = undefined;
        mazeVisualizer.setState({
            x: finalPosition.x,
            y: finalPosition.y,
        });
        if (error) mazeVisualizer.showMessage(error);
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
                : body.terminationReason === "incomplete"
                  ? "Agent stopped before unlocking the exit"
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
    mazeVisualizer.configure(mazeConfiguration);
});
resetButton?.addEventListener("click", () => window.location.reload());
mazeVisualizer.showMessage("Ready to run the LLM agent");
