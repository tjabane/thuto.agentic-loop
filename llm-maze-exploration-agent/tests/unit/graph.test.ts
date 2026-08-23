import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { isVertexId, parseVertexId, vertexId } from "../../src/models/graph.js";

describe("graph", () => {
    describe("vertexId", () => {
        test("creates an identifier from valid coordinates", () => {
            assert.equal(vertexId(1, 2), "1,2");
        });

        test("rejects coordinates outside the 3x3 grid", () => {
            assert.throws(() => vertexId(-1, 0), RangeError);
            assert.throws(() => vertexId(3, 0), RangeError);
            assert.throws(() => vertexId(0, 3), RangeError);
        });

        test("rejects non-integer coordinates", () => {
            assert.throws(() => vertexId(1.5, 2), RangeError);
        });
    });

    describe("isVertexId", () => {
        test("accepts identifiers within the 3x3 grid", () => {
            assert.equal(isVertexId("0,0"), true);
            assert.equal(isVertexId("2,2"), true);
        });

        test("rejects malformed and out-of-range identifiers", () => {
            for (const value of ["3,0", "0,-1", "1.0,2", "1, 2", "1,2,0"]) {
                assert.equal(isVertexId(value), false);
            }
        });
    });

    describe("parseVertexId", () => {
        test("parses an identifier into numeric coordinates", () => {
            assert.deepEqual(parseVertexId("2,1"), { x: 2, y: 1 });
        });

        test("rejects an invalid identifier", () => {
            assert.throws(
                () => parseVertexId("3,1"),
                new TypeError("Invalid vertex identifier: 3,1"),
            );
        });
    });
});
