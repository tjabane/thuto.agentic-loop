import type { MazeMap } from "../../../map/map-contracts.js";
import { isValidToolInput } from "../../schemas.js";
import type { Tool, ToolInputValue, ToolResult } from "../../tool-contracts.js";

const UPDATE_MAP_INPUT_SCHEMA = {
    type: "object",
    properties: {
        node: { type: "string" },
        edges: { type: "array", items: { type: "string" } },
    },
    required: ["node", "edges"],
    additionalProperties: false,
} as const;

/** Updates the discovered maze map with a room and its adjacent rooms. */
class UpdateMapTool implements Tool {
    public readonly name = "update_map";
    public readonly description =
        "Add a room and its adjacent rooms, then return the full discovered map.";
    public readonly inputSchema = UPDATE_MAP_INPUT_SCHEMA;

    constructor(private readonly map: MazeMap) {}

    public async execute(input: unknown): Promise<ToolResult> {
        if (!isValidToolInput(input, this.inputSchema) || !isMapUpdate(input)) {
            return invalidMapUpdate();
        }
        this.map.updateMap(input.node, input.edges);
        return { success: true, message: "Map updated.", data: this.map.readMap() };
    }
}

function isMapUpdate(
    input: Readonly<Record<string, ToolInputValue>>,
): input is Readonly<{ node: string; edges: readonly string[] }> {
    return (
        typeof input.node === "string" &&
        input.node.trim().length > 0 &&
        Array.isArray(input.edges) &&
        input.edges.length > 0 &&
        input.edges.every(edge => typeof edge === "string" && edge.trim().length > 0)
    );
}

function invalidMapUpdate(): ToolResult {
    return {
        success: false,
        message: "Map updates require a non-empty node and an array of non-empty edge nodes.",
    };
}

export { UpdateMapTool };
