import { Agent } from "./agent.js";
import { Enviroment } from "./enviroment.js";
import { LLMClient } from "./llm/client.js";
import { LlmActionPlanner } from "./llm/planner.js";

const client = new LLMClient();
const planner = new LlmActionPlanner(client);
const agent = new Agent(planner);
const enviroment = new Enviroment(
    3,
    { x: 1, y: 1 },
    { x: 2, y: 2 },
    new Set([{ x: 1, y: 0 }]),
);

const result = await agent.run(enviroment);
console.log(JSON.stringify(result, null, 2));
