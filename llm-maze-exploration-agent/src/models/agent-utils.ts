import { Direction } from "./position.js";
import { VertexId } from "../models/graph.js"
import { Tree } from "../models/tree.js"
import { from } from "node:stream/iter";

type Action =
    | { type: "move"; direction: Direction }
    | { type: "takeKey" }
    | { type: "unlockExist" }
    | { type: "exit" };

type AgentState = {
      position: VertexId;
      pathTree: Tree;
      blockedNodes: VertexId[];
      isKeyCollected: boolean;
      existLocation?: VertexId;
      isExistUnlocked: boolean;
  };


export { Action, AgentState }