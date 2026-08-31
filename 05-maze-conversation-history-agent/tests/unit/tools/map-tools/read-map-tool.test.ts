import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { GraphMap } from "../../../../src/map/graph-map.js";
import { ReadMapTool } from "../../../../src/tools/map-tools/read-map-tool.js";

describe("ReadMapTool", () => {
    test("reads the map without changing it", async () => {
        const map = new GraphMap();
        map.updateMap("start", ["exit"]);
        const tool = new ReadMapTool(map);

        assert.equal(tool.name, "read_map");
        assert.deepEqual(await tool.execute({}), {
            success: true,
            message: "Current map retrieved.",
            data: { nodes: ["start", "exit"], edges: [["start", "exit"]] },
        });
    });
});
