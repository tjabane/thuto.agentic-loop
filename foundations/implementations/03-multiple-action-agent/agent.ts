import { Direction, Direction, Observation, Position, Action, MoveHistory } from "./types.js";
import { Environment } from "./enviroment.js";

class Agent {
    private position: Position;
    private path: Position[];
    private observations: Set<Observation>;
    private blockedCells: Set<Position>;
    private moveHistory: MoveHistory[];
    private hasKey: boolean;
    private cellHasKey: boolean;
    private cellIsLocked: boolean;
    private hasExited: boolean;
    private isAtExist: boolean;
    private hasUnlockedExit: boolean;
    private IsRunning: boolean;

    constructor(position: Position) {
        this.position = position;
        this.path = [];
        this.moveHistory = [];
        this.observations = new Set<Observation>;
        this.blockedCells = new Set<Position>();
        this.hasKey = false;
        this.cellHasKey = false;
        this.cellIsLocked = false;
        this.hasExited = false;
        this.isAtExist = false;
        this.hasUnlockedExit = false;
        this.IsRunning = true;
    }

    public InspectCell(environment: Environment): void {
        if(Agent.hasBeenHereBefore(this.position, this.observations))
            return;
        let currentCell = environment.viewCell(this.position);
        this.hasKey = currentCell.hasKey;
        this.cellIsLocked = currentCell.isUnlocked;
        this.isAtExist = currentCell.isExit;
        this.path.push(this.position);
        this.observations.add(currentCell);
    }


    private static hasBeenHereBefore(currentPosition: Position, pastPositions: Set<Observation>): boolean
    {
        return [...pastPositions].some(seen => seen.position.x === currentPosition.x && seen.position.y === currentPosition.y);
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
        let directions: Direction[] = ["up", "down", "left", "right"];
        for(const direction in directions)
        {
            if(this.moveHistory.length > 0) {
                const lastMove = this.moveHistory[this.moveHistory.length - 1];
                if (lastMove?.direction === direction && this.position === lastMove?.position) {
                    directions = directions.splice(directions.indexOf(direction), 1);
                }
            }
            const gotoDirection = directions[Math.floor(Math.random() * directions.length)];
            console.log(`next random direction ${gotoDirection}`);
            return gotoDirection;
        }
        throw Error("No validate direction Available");
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
            this.blockedCells.add(this.position);
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
