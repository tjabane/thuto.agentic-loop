import { readFile } from "node:fs/promises";
import {
    createServer,
    type IncomingMessage,
    type ServerResponse,
} from "node:http";
import { extname, join } from "node:path";

import { Enviroment } from "../../04-maze-llm-agent/src/enviroment.js";
import type {
    Direction,
    NodeInformation,
    Position,
} from "../../04-maze-llm-agent/src/models/position.js";
import { Agent } from "../../05-maze-conversation-history-agent/src/agent.js";
import { LLMClient } from "../../05-maze-conversation-history-agent/src/llm/client.js";
import { createMazeTools } from "../../05-maze-conversation-history-agent/src/tools/maze-tools.js";
import type {
    MazeConfiguration,
    MazeRunResponse,
    VisualDirection,
    VisualEvent,
} from "./types.js";

const PORT = Number(process.env.VISUALIZATION_PORT ?? 3000);
const MAX_ACTIONS = Number(process.env.LLM_E2E_MAX_ACTIONS ?? 25);
const VISUALIZATION_ROOT = join(
    process.cwd(),
    "visualizations",
    "maze-visualization",
);
const visualDirections: Record<Direction, VisualDirection> = {
    up: "north",
    right: "east",
    down: "south",
    left: "west",
};

class TracingEnviroment extends Enviroment {
    readonly trace: VisualEvent[] = [];

    override inspectCurrentNode(): NodeInformation {
        const observation = super.inspectCurrentNode();
        this.trace.push({
            type: "inspect",
            position: { ...observation.position },
        });
        return observation;
    }

    override move(direction: Direction): Position {
        const before = this.getState().agentPostion;
        const result = super.move(direction);
        this.trace.push({
            type: "move",
            direction: visualDirections[direction],
            succeeded: before.x !== result.x || before.y !== result.y,
        });
        return result;
    }

    override takeKey(): boolean {
        const succeeded = super.takeKey();
        this.trace.push({ type: "takeKey", succeeded });
        return succeeded;
    }

    override unlockExist(): boolean {
        const succeeded = super.unlockExist();
        this.trace.push({ type: "unlockExit", succeeded });
        return succeeded;
    }
}

function isPosition(value: unknown): value is Position {
    if (typeof value !== "object" || value === null) return false;
    const candidate = value as Record<string, unknown>;
    return Number.isInteger(candidate.x) && Number.isInteger(candidate.y);
}

function isMazeConfiguration(value: unknown): value is MazeConfiguration {
    if (typeof value !== "object" || value === null) return false;
    const candidate = value as Record<string, unknown>;
    return (
        candidate.rows === 3 &&
        candidate.columns === 3 &&
        isPosition(candidate.start) &&
        candidate.start.x === 0 &&
        candidate.start.y === 0 &&
        isPosition(candidate.key) &&
        isPosition(candidate.exit) &&
        Array.isArray(candidate.blockedCells) &&
        candidate.blockedCells.every(isPosition)
    );
}

async function readJson(request: IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
        chunks.push(Buffer.from(chunk));
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(
    response: ServerResponse,
    status: number,
    body: unknown,
): void {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
}

async function runMaze(
    configuration: MazeConfiguration,
): Promise<MazeRunResponse> {
    const enviroment = new TracingEnviroment(
        configuration.rows,
        configuration.key,
        configuration.exit,
        new Set(configuration.blockedCells),
    );
    let actionCount = 0;
    const tools = createMazeTools(enviroment).map((tool) => ({
        ...tool,
        async execute(input: unknown) {
            actionCount += 1;
            return tool.execute(input);
        },
    }));
    const client = new LLMClient();
    const agent = new Agent(
        `Explore this unknown 3x3 maze through the available tools.
        Find and take the key, find the exit, and unlock it.
        Your conversation with the tools is your only memory of the maze.
        Do not claim completion until unlockExit reports exitUnlocked as true.
        Request one tool at a time. After the exit is unlocked, return a short final response.`,
        tools,
        client,
    );

    let reachedTurnLimit = false;
    try {
        await agent.run(MAX_ACTIONS);
    } catch (error) {
        if (
            error instanceof Error &&
            error.message === "Maximum number of turns reached"
        ) {
            reachedTurnLimit = true;
        } else {
            throw error;
        }
    }

    const finalState = enviroment.getState();
    const succeeded = !finalState.isExistLocked;
    const terminationReason = succeeded
        ? "success"
        : reachedTurnLimit
          ? "action_limit"
          : "incomplete";

    enviroment.trace.push({
        type: "exit",
        succeeded,
    });

    return {
        trace: enviroment.trace,
        finalPosition: { ...finalState.agentPostion },
        terminationReason,
        actionCount,
    };
}

const staticFiles: Record<string, string> = {
    "/": "index.html",
    "/index.html": "index.html",
    "/styles.css": "styles.css",
    "/visualization.js": "visualization.js",
    "/app.js": "app.js",
};
const contentTypes: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
};

const server = createServer(async (request, response) => {
    try {
        if (request.method === "POST" && request.url === "/api/run") {
            const configuration = await readJson(request);
            if (!isMazeConfiguration(configuration)) {
                sendJson(response, 400, {
                    error: "Invalid 3x3 maze configuration.",
                });
                return;
            }
            sendJson(response, 200, await runMaze(configuration));
            return;
        }

        const filename = staticFiles[request.url ?? ""];
        if (request.method !== "GET" || !filename) {
            sendJson(response, 404, { error: "Not found." });
            return;
        }

        const body = await readFile(join(VISUALIZATION_ROOT, filename));
        response.writeHead(200, {
            "Content-Type":
                contentTypes[extname(filename)] ?? "application/octet-stream",
        });
        response.end(body);
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Unknown server error.";
        sendJson(response, 500, { error: message });
    }
});

server.listen(PORT, () => {
    console.log(`LLM maze visualization: http://localhost:${PORT}`);
});
