import { Direction, Observation, Position, Action, MoveHistory } from "./types.js";
import { Environment } from "./enviroment.js";

class Agent {
    private position: Position;
    private path: Position[];
    private observations: Set<Observation>;
    private blockedCells: Set<string>;
    private moveHistory: MoveHistory[];
    private hasKey: boolean;
    private cellHasKey: boolean;
    private cellIsLocked: boolean;
    private hasExited: boolean;
    private isAtExist: boolean;
    private hasUnlockedExit: boolean;
    private IsRunning: boolean;

    constructor(position: Position, hasKey: boolean = false) {
        this.position = position;
        this.path = [];
        this.moveHistory = [];
        this.observations = new Set<Observation>;
        this.blockedCells = new Set<string>();
        this.hasKey = hasKey;
        this.cellHasKey = false;
        this.cellIsLocked = false;
        this.hasExited = false;
        this.isAtExist = false;
        this.hasUnlockedExit = false;
        this.IsRunning = true;
    }

    public InspectCell(environment: Environment): void {
        let currentCell = environment.viewCell(this.position);
        this.cellHasKey = currentCell.hasKey;
        this.cellIsLocked = currentCell.isUnlocked;
        this.isAtExist = currentCell.isExit;
        this.path.push(this.position);
        this.observations.add(currentCell);
    }

    public think(): Action {
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
        if(directions.length === 0)
        {
            throw Error("No validate direction Available");
        }
        else {
            return directions[Math.floor(Math.random() * directions.length)];
        }
    }

    private cellKey(cell: Position): string {
        return `${cell.x},${cell.y}`;
    }

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

    private getValidDirections(): Direction[] {
        let directions: Direction[] = ["up", "down", "left", "right"];

        for (const direction of directions)
        {
            const neighbour = this.getNeighbour(direction);
            const isBlocked = this.blockedCells.has(this.cellKey(neighbour));
            if (isBlocked) {
                directions = directions.filter(candidate => candidate !== direction);
            }
        }

        return directions;
    }

    public ActOnAction(action: Action, environment: Environment): void {
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

    private Move(direction: Direction, environment: Environment): void {
        this.moveHistory.push({ position: this.position, direction: direction });
        const newPosition: Position = environment.changeAgentPosition(direction);
        if(newPosition.x !== -1 && newPosition.y !== -1) {
            console.log(`Moving ${direction} to position (${newPosition.x}, ${newPosition.y})`);
            this.position = newPosition;
        }
        else {
            console.log("Move blocked or out of bounds.");
            this.blockedCells.add(this.cellKey(this.getNeighbour(direction)));
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
