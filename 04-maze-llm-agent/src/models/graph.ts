/**
 * A vertex identifier encoded as comma-separated x and y coordinates.
 *
 * @example
 * ```ts
 * const origin: VertexId = "0,0";
 * ```
 */
type VertexId = `${number},${number}`;

/** An undirected connection between two vertices in a tree. */
type Edge = readonly [from: VertexId, to: VertexId];

/** Cartesian coordinates for a vertex in the 3x3 grid. */
interface VertexCoordinates {
    /** The horizontal coordinate, from 0 through 2. */
    x: number;

    /** The vertical coordinate, from 0 through 2. */
    y: number;
}
/**
 * Creates a vertex identifier from coordinates in the 3x3 grid.
 *
 * @param x - The horizontal coordinate, from 0 through 2.
 * @param y - The vertical coordinate, from 0 through 2.
 * @returns The coordinates encoded as `"x,y"`.
 * @throws {RangeError} When either coordinate is not an integer from 0 through 2.
 */
function vertexId(x: number, y: number): VertexId {
    if (!isGridCoordinate(x) || !isGridCoordinate(y)) {
        throw new RangeError(
            "Vertex coordinates must be integers between 0 and 2.",
        );
    }

    return `${x},${y}`;
}

/**
 * Determines whether a string is a valid vertex identifier for the 3x3 grid.
 *
 * @param value - The value to validate.
 * @returns `true` when the value has the form `"x,y"` and both coordinates are
 * integers from 0 through 2.
 */
function isVertexId(value: string): value is VertexId {
    return /^[0-2],[0-2]$/.test(value);
}

/**
 * Parses a 3x3-grid vertex identifier into numeric coordinates.
 *
 * @param id - The vertex identifier to parse.
 * @returns The numeric x and y coordinates.
 * @throws {TypeError} When the identifier is not valid for the 3x3 grid.
 */
function parseVertexId(id: string): VertexCoordinates {
    if (!isVertexId(id)) {
        throw new TypeError(`Invalid vertex identifier: ${id}`);
    }

    const [x, y] = id.split(",").map(Number) as [number, number];
    return { x, y };
}

/** Determines whether a number is a coordinate in a 3x3 grid. */
function isGridCoordinate(value: number): boolean {
    return Number.isInteger(value) && value >= 0 && value <= 2;
}

export {
    type Edge,
    isVertexId,
    parseVertexId,
    type VertexCoordinates,
    type VertexId,
    vertexId,
};
