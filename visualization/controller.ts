import { Agent } from "../maze-exploration-agent/agent.js";
import { Environment } from "../maze-exploration-agent/environment.js";
import type {
    Direction,
    Observation,
    Position,
} from "../maze-exploration-agent/support/types.js";

type VisualDirection = "north" | "east" | "south" | "west";
type VisualEvent =
    | { type: "inspect"; position: Position }
    | { type: "move"; direction: VisualDirection; succeeded: boolean }
    | { type: "takeKey"; succeeded: boolean }
    | { type: "unlockExit"; succeeded: boolean }
    | { type: "exit"; succeeded: boolean };

type MazeVisualizer = {
    move(direction: VisualDirection): boolean;
    takeKey(): boolean;
    unlockExit(): boolean;
    reset(): void;
    configure(config: MazeConfiguration): void;
    setState(state: { x: number; y: number; hasKey?: boolean; exitUnlocked?: boolean }): void;
    showMessage(message: string): void;
    showBlockedMove(direction: string): void;
};

type MazeConfiguration = {
    rows: number;
    columns: number;
    blockedCells: Position[];
    start: Position;
    key: Position;
    exit: Position;
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
const visualDirections: Record<Direction, VisualDirection> = {
    up: "north",
    right: "east",
    down: "south",
    left: "west",
};

class TracingEnvironment extends Environment {
    readonly trace: VisualEvent[] = [];
    override viewCurrentCell(): Observation {
        const position = this.getAgentPosition();
        this.trace.push({ type: "inspect", position: { ...position } });
        return super.viewCurrentCell();
    }

    override changeAgentPosition(direction: Direction): Position {
        const result = super.changeAgentPosition(direction);
        this.trace.push({
            type: "move",
            direction: visualDirections[direction],
            succeeded: result.x !== -1 && result.y !== -1,
        });
        return result;
    }

    override collectKey(): boolean {
        const succeeded = super.collectKey();
        this.trace.push({ type: "takeKey", succeeded });
        return succeeded;
    }

    override unlockExit(): boolean {
        const succeeded = super.unlockExit();
        this.trace.push({ type: "unlockExit", succeeded });
        return succeeded;
    }

    override agentExited(): boolean {
        const succeeded = super.agentExited();
        this.trace.push({ type: "exit", succeeded });
        return succeeded;
    }
}

const runButton = document.getElementById("autoButton") as HTMLButtonElement | null;
const randomButton = document.getElementById("randomButton") as HTMLButtonElement | null;
const resetButton = document.getElementById("resetButton") as HTMLButtonElement | null;
let replayTimer: number | undefined;

function makePositionKey(position: Position): string {
    return `${position.x},${position.y}`;
}

function positionsAreConnected(config: MazeConfiguration): boolean {
    const blocked = new Set(config.blockedCells.map(makePositionKey));
    const pending: Position[] = [config.start];
    const visited = new Set<string>([makePositionKey(config.start)]);
    const targets = new Set([makePositionKey(config.key), makePositionKey(config.exit)]);
    const offsets: readonly [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];

    while (pending.length > 0) {
        const current = pending.shift();
        if (!current) break;
        targets.delete(makePositionKey(current));
        for (const [xOffset, yOffset] of offsets) {
            const neighbour = { x: current.x + xOffset, y: current.y + yOffset };
            const key = makePositionKey(neighbour);
            if (
                neighbour.x >= 0 && neighbour.x < config.columns &&
                neighbour.y >= 0 && neighbour.y < config.rows &&
                !blocked.has(key) && !visited.has(key)
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
    })).filter(position => makePositionKey(position) !== makePositionKey(start));

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

function describe(event: VisualEvent): string {
    switch (event.type) {
        case "inspect": return `Inspecting (${event.position.x}, ${event.position.y})`;
        case "takeKey": return event.succeeded ? "Key collected" : "No key in this room";
        case "unlockExit": return event.succeeded ? "Exit unlocked" : "Exit could not be unlocked";
        case "exit": return event.succeeded ? "Agent escaped the maze" : "No open exit here";
        case "move": return event.succeeded ? `Moving ${event.direction}` : `Move ${event.direction} blocked`;
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

function replay(trace: VisualEvent[], finalPosition: Position, error?: string): void {
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

function runAgent(): void {
    if (replayTimer !== undefined) return;
    if (runButton) {
        runButton.disabled = true;
        runButton.textContent = "Planning…";
    }
    if (randomButton) randomButton.disabled = true;
    window.setTimeout(() => {
        const { rows, columns, blockedCells, key, exit, start } = mazeConfiguration;
        const environment = new TracingEnvironment(rows, columns, blockedCells, key, exit, start);
        const agent = new Agent(start);
        let error: string | undefined;
        try {
            agent.Run(environment);
        } catch (cause) {
            error = cause instanceof Error ? cause.message : String(cause);
        }
        if (runButton) runButton.textContent = "Replaying…";
        replay(environment.trace, environment.getAgentPosition(), error);
    }, 0);
}

runButton?.addEventListener("click", runAgent);
randomButton?.addEventListener("click", () => {
    if (replayTimer !== undefined) return;
    mazeConfiguration = generateRandomMaze();
    window.mazeVisualizer.configure(mazeConfiguration);
});
resetButton?.addEventListener("click", () => window.location.reload());
window.mazeVisualizer.showMessage("Ready to run the TypeScript agent");
