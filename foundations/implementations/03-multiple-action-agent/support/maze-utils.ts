import { Position } from "./types.js";


function makeCellKey(cell: Position): string {
        return `${cell.x},${cell.y}`;
}

export { makeCellKey }
