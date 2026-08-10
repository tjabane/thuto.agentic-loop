import { Agent } from "./agent.js";
import { Environment } from "./enviroment.js";
import { Position } from "./types.js";

const startPosition: Position = { x: 0, y: 0 };
const blockedCells: Position[] = [{ x: 1, y: 1 }];
const keyPosition: Position = { x: 2, y: 0 };
const exitPosition: Position = { x: 2, y: 2 };

const environment = new Environment(
    3,
    3,
    blockedCells,
    keyPosition,
    exitPosition,
);

const agent = new Agent(startPosition);

export { agent, environment };
