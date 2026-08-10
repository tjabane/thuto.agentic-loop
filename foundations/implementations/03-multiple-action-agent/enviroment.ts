
import { Observation, Position, direction } from "./types.js";

class Environment {
    private readonly maze: number[][];
    private readonly agentPosition: Position;
    private readonly keyPosition: Position;
    private readonly exitPosition: Position;
    private isKeyCollected: boolean;
    private isExitLocked: boolean;

    constructor(numberOfRows: number, numberOfColumns: number, blockedCells: Position[], keyPosition: Position, exitPosition: Position) {
        this.maze = Array(numberOfRows).fill(null).map(() => Array(numberOfColumns).fill(0));
        this.agentPosition = { x: 0, y: 0 };
        this.keyPosition = keyPosition;
        this.exitPosition = exitPosition;
        this.isKeyCollected = false;
        this.isExitLocked = true;

        for (const cell of blockedCells) {
            this.maze[cell.y][cell.x] = 1;
        }
    }

    changeAgentPosition(direction: direction): Position {
        if (direction === "up" && this.agentPosition.y > 0 && this.maze[this.agentPosition.y - 1][this.agentPosition.x] === 0) {
            this.agentPosition.y--;
        }
        else if (direction === "down" && this.agentPosition.y < this.maze.length - 1 && this.maze[this.agentPosition.y + 1][this.agentPosition.x] === 0) {
            this.agentPosition.y++;
        }
        else if (direction === "left" && this.agentPosition.x > 0 && this.maze[this.agentPosition.y][this.agentPosition.x - 1] === 0) {
            this.agentPosition.x--;
        }
        else if (direction === "right" && this.agentPosition.x < this.maze[0].length - 1 && this.maze[this.agentPosition.y][this.agentPosition.x + 1] === 0) {
            this.agentPosition.x++;
        }
        else
            return {x: -1, y: -1};
        return { x: this.agentPosition.x, y: this.agentPosition.y };
    }

    collectKey(location: Position): boolean {
        if (this.keyPosition.x === location.x && this.keyPosition.y === location.y) {
            this.isKeyCollected = true;
            return true;
        }
        return false;
    }

    unlockExit(location: Position): boolean {
        if (this.exitPosition.x === location.x && this.exitPosition.y === location.y && this.isKeyCollected) {
            this.isExitLocked = false;
            return true;
        }
        return false;
    }

    agentExisted(location: Position): boolean {
        if (this.exitPosition.x === location.x && this.exitPosition.y === location.y && !this.isExitLocked) {
            return true;
        }
        return false;
    }

    viewCell(location: Position): Observation {
        return {
            currentPosition: location,
            isBlocked: this.maze[location.y][location.x] === 1,
            hasKey: this.keyPosition.x === location.x && this.keyPosition.y === location.y && !this.isKeyCollected,
            isExit: this.exitPosition.x === location.x && this.exitPosition.y === location.y,
            isUnlocked: this.isExitLocked
        };
    }
}