import { readFile } from "node:fs/promises";
import {
    createServer,
    type IncomingMessage,
    type ServerResponse,
} from "node:http";
import { extname, join } from "node:path";

import { Agent } from "../../04-maze-llm-agent/src/agent.js";
import { Enviroment } from "../../04-maze-llm-agent/src/enviroment.js";
import { LLMClient } from "../../04-maze-llm-agent/src/llm/client.js";
import { LlmActionPlanner } from "../../04-maze-llm-agent/src/llm/planner.js";
import { parseVertexId } from "../../04-maze-llm-agent/src/models/graph.js";
import type {
    Direction,
    NodeInformation,
    Position,
} from "../../04-maze-llm-agent/src/models/position.js";
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
    const client = new LLMClient();
    const planner = new LlmActionPlanner(client);
    const agent = new Agent(planner);
    const result = await agent.run(enviroment, MAX_ACTIONS);
    const finalPosition = parseVertexId(result.finalState.position);

    enviroment.trace.push({
        type: "exit",
        succeeded: result.terminationReason === "success",
    });

    return {
        trace: enviroment.trace,
        finalPosition,
        terminationReason: result.terminationReason,
        actionCount: result.actionCount,
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
