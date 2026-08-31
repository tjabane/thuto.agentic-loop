import { readFile } from "node:fs/promises";
import {
    createServer,
    type IncomingMessage,
    type ServerResponse,
} from "node:http";
import { extname, join } from "node:path";

import { Agent } from "../src/agent.js";
import { OpenAiDecisionClient } from "../src/decision-client/openai-decision-client.js";
import { Enviroment } from "../src/enviroment.js";
import { GraphMap } from "../src/map/graph-map.js";
import type { MazeMap } from "../src/map/map-contracts.js";
import type { Position } from "../src/models/position.js";
import { InspectCurrentNodeTool } from "../src/tools/environment/inspect-current-node-tool.js";
import { ReadMapTool } from "../src/tools/map-tools/read-map-tool.js";
import { UpdateMapTool } from "../src/tools/map-tools/update-map-tool.js";
import { MoveTool } from "../src/tools/environment/move-tool.js";
import { TakeKeyTool } from "../src/tools/environment/take-key-tool.js";
import { UnlockExitTool } from "../src/tools/environment/unlock-exit-tool.js";
import type { Tool, ToolResult } from "../src/tools/tool-contracts.js";
import type {
    MazeConfiguration,
    MazeRunResponse,
    VisualAction,
} from "./types.js";
import { appendTraceAction, appendTraversalGraphUpdate } from "./trace.js";

const PORT = Number(process.env.VISUALIZATION_PORT ?? 3000);
const MAX_ACTIONS = 25;
const VISUALIZATION_ROOT = join(process.cwd(), "visualization");
const SYSTEM_PROMPT = `You control an agent in an unknown 3x3 maze through the supplied tools.
Collect the key, then unlock the exit. Begin by calling inspect_current_node. After every successful move, inspect the new node before another action.
Use only verified results. Track each verified position and move direction, systematically explore unvisited adjacent cells, and do not repeat a known failed move. Collect a discovered key immediately, then navigate directly to a discovered exit.
The map is maintained automatically from successful traversals. You may read it, but prioritise maze actions. Request exactly one tool per turn until the exit is verified unlocked.`;

class TracingTool implements Tool {
    constructor(
        private readonly inner: Tool,
        private readonly enviroment: Enviroment,
        private readonly map: MazeMap,
        private readonly updateMapTool: UpdateMapTool,
        private readonly trace: VisualAction[],
    ) {}

    public get name(): string {
        return this.inner.name;
    }

    public get description(): string {
        return this.inner.description;
    }

    public get inputSchema() {
        return this.inner.inputSchema;
    }

    public async execute(input: unknown): Promise<ToolResult> {
        const previousPosition = this.enviroment.getState().agentPostion;
        const result = await this.inner.execute(input);
        appendTraceAction(this.trace, this.inner.name, input, result, this.map);

        if (this.inner.name === "move" && result.success) {
            const position = result.data?.position;
            if (isPosition(position)) {
                await appendTraversalGraphUpdate(
                    this.trace,
                    this.map,
                    this.updateMapTool,
                    previousPosition,
                    position,
                );
            }
        }
        return result;
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
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
}

async function runMaze(configuration: MazeConfiguration): Promise<MazeRunResponse> {
    const enviroment = new Enviroment(
        configuration.rows,
        configuration.key,
        configuration.exit,
        new Set(configuration.blockedCells),
    );
    const map = new GraphMap();
    const updateMapTool = new UpdateMapTool(map);
    const trace: VisualAction[] = [];
    const tools = [
        new MoveTool(enviroment),
        new TakeKeyTool(enviroment),
        new UnlockExitTool(enviroment),
        new InspectCurrentNodeTool(enviroment),
        updateMapTool,
        new ReadMapTool(map),
    ].map(tool => new TracingTool(tool, enviroment, map, updateMapTool, trace));

    await new Agent(tools, new OpenAiDecisionClient({}, SYSTEM_PROMPT)).run(MAX_ACTIONS);

    const finalState = enviroment.getState();
    return {
        trace,
        finalPosition: { ...finalState.agentPostion },
        terminationReason: !finalState.isExistLocked
            ? "success"
            : trace.length >= MAX_ACTIONS
              ? "action_limit"
              : "incomplete",
        actionCount: trace.length,
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
                sendJson(response, 400, { error: "Invalid 3x3 maze configuration." });
                return;
            }
            sendJson(response, 200, await runMaze(configuration));
            return;
        }

        const filename = staticFiles[request.url ?? ""];
        if (request.method !== "GET" || filename === undefined) {
            sendJson(response, 404, { error: "Not found." });
            return;
        }

        const body = await readFile(join(VISUALIZATION_ROOT, filename));
        response.writeHead(200, {
            "Content-Type": contentTypes[extname(filename)] ?? "application/octet-stream",
        });
        response.end(body);
    } catch (error) {
        sendJson(response, 500, {
            error: error instanceof Error ? error.message : "Unknown server error.",
        });
    }
});

server.listen(PORT, () => {
    console.log(`LLM maze visualization: http://localhost:${PORT}`);
});
