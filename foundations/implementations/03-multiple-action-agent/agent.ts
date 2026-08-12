import { Direction, Observation, Position, Action, MoveHistory } from "./types.js";
import { Environment } from "./enviroment.js";
import { makeCellKey } from "./maze-utils.js";

class Agent {
    private position: Position;
    private ExistLocation: Position;
    private path: Position[];
    private observations: Set<Observation>;
    private blockedCells: Set<string>;
    private moveHistory: MoveHistory[];
    private hasKey: boolean;
    private cellHasKey: boolean;
    private cellIsLocked: boolean;
    private isAtExist: boolean;
    private hasExited: boolean;
    private hasUnlockedExit: boolean;
    private IsRunning: boolean;

    constructor(position: Position, hasKey: boolean = false) {
        this.position = position;
        this.ExistLocation = {x: -1, y: -1};
        this.path = [];
        this.moveHistory = [];
        this.observations = new Set<Observation>;
        this.blockedCells = new Set<string>();
        this.hasKey = hasKey;
        this.cellHasKey = false;
        this.cellIsLocked = false;
        this.isAtExist = false;
        this.hasExited = false;
        this.hasUnlockedExit = false;
        this.IsRunning = true;
    }

    private observeCell(environment: Environment): void {
        let currentCell = environment.viewCell(this.position);
        this.cellHasKey = currentCell.hasKey;
        this.cellIsLocked = currentCell.isUnlocked;
        this.isAtExist = currentCell.isExit;
        
        this.observations.add(currentCell);
        if(currentCell.isExit && !this.hasKey)
        {
            this.ExistLocation = currentCell.position
        }
        
    }

    private think(): Action {
        if (this.hasKey && this.cellIsLocked && this.isAtExist) {
            return { type: "unlockExit" };
        }
        if (this.hasKey && this.isAtExist && !this.cellIsLocked) {
            return { type: "exit" };
        }
        if (!this.hasKey && this.cellHasKey) {
            return { type: "takeKey" };
        }
        return { type: "move", direction: this.getRandomDirection() };
    }

    private getRandomDirection(): Direction {
        let directions: Direction[] = this.getValidDirections();
        let newPaths = this.getUnExploredCells(directions);
        if(newPaths.length > 0)
        {
            return newPaths[Math.floor(Math.random() * newPaths.length)];
        }
        if(directions.length === 0)
        {
            throw Error("No validate direction Available");
        }
        else {
            return directions[Math.floor(Math.random() * directions.length)];
        }
    }

    private getValidDirections(): Direction[] {
        let directions: Direction[] = ["up", "down", "left", "right"];

        for (const direction of directions)
        {
            const neighbour = this.getNeighbour(direction);
            const isBlocked = this.blockedCells.has(makeCellKey(neighbour));
            if (isBlocked) {
                directions = directions.filter(candidate => candidate !== direction);
            }
        }
        return directions;
    }

    private getUnExploredCells(directions: Direction[]): Direction[]
    {
        return directions.filter(direction => {
            const neighbour:Position = this.getNeighbour(direction);
            const hasSeen:boolean =  this.path.some(past => past.x === neighbour.x && past.y === neighbour.y)
            return !hasSeen;
        })
    }

    /**
     * Returns the position of the cell adjacent to the agent's current
     * position in the given direction.
     *
     * The grid's y axis grows downward, so `up` decrements y and `down`
     * increments it. No bounds or wall checking happens here — the returned
     * position may be outside the maze or blocked.
     *
     * @param direction - The direction to step in from the current position.
     * @returns The coordinates of the neighbouring cell.
     */
    private getNeighbour(direction: Direction): Position {
        const currentPosition: Position = this.position;
        const neighbours: Record<Direction, Position> = {
            up: { x: currentPosition.x, y: currentPosition.y - 1 },
            down: { x: currentPosition.x, y: currentPosition.y + 1 },
            left: { x: currentPosition.x - 1, y: currentPosition.y },
            right: { x: currentPosition.x + 1, y: currentPosition.y }
        };

        return neighbours[direction];
    }

    private performAction(action: Action, environment: Environment): void {
        switch (action.type) {
            case "move":
                if (action.direction) {
                    this.Move(action.direction, environment);
                }
                break;
            case "takeKey":
                this.TakeKey(environment);
                break;
            case "unlockExit":
                this.UnlockExit(environment);
                break;
            case "exit":
                this.Exit(environment);
                break;
            default:
                console.log("Unknown action type");
        }
    }

    public Run(enviroment: Environment): void {
        while(this.IsRunning)
        {
            this.observeCell(enviroment);
            const action: Action = this.think();
            this.performAction(action, enviroment);
        }
    }

    private Move(direction: Direction, environment: Environment): void {
        this.moveHistory.push({ position: this.position, direction: direction });
        const newPosition: Position = environment.changeAgentPosition(direction);
        if(newPosition.x !== -1 && newPosition.y !== -1) {
            console.log(`Moving ${direction} to position (${newPosition.x}, ${newPosition.y})`);
            this.position = newPosition;
            this.path.push(this.position);
        }
        else {
            console.log("Move blocked or out of bounds.");
            this.blockedCells.add(makeCellKey(this.getNeighbour(direction)));
        }
    }

    private TakeKey(environment: Environment): void {
        const keyCollected = environment.collectKey(this.position);
        if(keyCollected) {
            this.hasKey = true;
            console.log("Key collected!");
        }
    }

    private UnlockExit(environment: Environment): void {
        const exitUnlocked = environment.unlockExit(this.position);
        if(exitUnlocked) {
            this.hasUnlockedExit = true;
            console.log("Exit unlocked!");
        }
    }

    private Exit(environment: Environment): void {
        const hasExited = environment.agentExisted(this.position);
        if(hasExited) {
            this.hasExited = true;
            this.IsRunning = false;
            console.log("Agent has exited!");
        }
    }
}

export { Agent };
