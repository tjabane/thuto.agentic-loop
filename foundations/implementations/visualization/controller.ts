import { Agent } from "../agent.js";
import { Environment } from "../enviroment.js";
import type { Direction, Observation, Position } from "../types.js";

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
    setState(state: { x: number; y: number; hasKey?: boolean; exitUnlocked?: boolean }): void;
    showMessage(message: string): void;
    showBlockedMove(direction: string): void;
};

declare global {
    interface Window {
        mazeVisualizer: MazeVisualizer;
    }
}

const START: Position = { x: 0, y: 0 };
const KEY: Position = { x: 2, y: 0 };
const EXIT: Position = { x: 2, y: 2 };
const BLOCKED: Position[] = [{ x: 1, y: 1 }];
const ACTION_LIMIT = 50;
const visualDirections: Record<Direction, VisualDirection> = {
    up: "north",
    right: "east",
    down: "south",
    left: "west",
};

class TracingEnvironment extends Environment {
    readonly trace: VisualEvent[] = [];
    private actions = 0;

    override viewCell(position: Position): Observation {
        this.trace.push({ type: "inspect", position: { ...position } });
        return super.viewCell(position);
    }

    override changeAgentPosition(direction: Direction): Position {
        this.guardLimit();
        const result = super.changeAgentPosition(direction);
        this.trace.push({
            type: "move",
            direction: visualDirections[direction],
            succeeded: result.x !== -1 && result.y !== -1,
        });
        return result;
    }

    override collectKey(position: Position): boolean {
        this.guardLimit();
        const succeeded = super.collectKey(position);
        this.trace.push({ type: "takeKey", succeeded });
        return succeeded;
    }

    override unlockExit(position: Position): boolean {
        this.guardLimit();
        const succeeded = super.unlockExit(position);
        this.trace.push({ type: "unlockExit", succeeded });
        return succeeded;
    }

    override agentExisted(position: Position): boolean {
        this.guardLimit();
        const succeeded = super.agentExisted(position);
        this.trace.push({ type: "exit", succeeded });
        return succeeded;
    }

    private guardLimit(): void {
        this.actions += 1;
        if (this.actions > ACTION_LIMIT) throw new Error(`Stopped after ${ACTION_LIMIT} actions`);
    }
}

const runButton = document.getElementById("autoButton") as HTMLButtonElement | null;
const resetButton = document.getElementById("resetButton") as HTMLButtonElement | null;
let replayTimer: number | undefined;

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
    };
    next();
}

function runAgent(): void {
    if (replayTimer !== undefined) return;
    if (runButton) {
        runButton.disabled = true;
        runButton.textContent = "Planning…";
    }
    window.setTimeout(() => {
        const environment = new TracingEnvironment(3, 3, BLOCKED, KEY, EXIT, START);
        const agent = new Agent(START);
        let error: string | undefined;
        try {
            agent.Run(environment);
        } catch (cause) {
            error = cause instanceof Error ? cause.message : String(cause);
        }
        if (runButton) runButton.textContent = "Replaying…";
        replay(environment.trace, environment.getAgentPostion(), error);
    }, 0);
}

runButton?.addEventListener("click", runAgent);
resetButton?.addEventListener("click", () => window.location.reload());
window.mazeVisualizer.showMessage("Ready to run the TypeScript agent");
