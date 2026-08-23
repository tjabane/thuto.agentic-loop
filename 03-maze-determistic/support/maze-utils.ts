import type { Position } from "./types.js";

/**
 * Converts maze coordinates into the canonical key used by traversal maps.
 *
 * @param cell - Coordinates to encode.
 * @returns A key in `x,y` form.
 */
function makeCellKey(cell: Position): string {
        return `${cell.x},${cell.y}`;
}

export { makeCellKey };
