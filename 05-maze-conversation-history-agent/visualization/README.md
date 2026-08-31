# Solution 05: Conversation-history maze agent visualization

The visualization runs the conversation-history agent on a local server so the
OpenAI API key is never exposed to browser JavaScript. The agent remembers its
model tool calls and verified environment results as conversation context.
Start it from the `05-maze-conversation-history-agent` directory:

```text
bun visualization/server.ts
```

Then open `http://localhost:3000`. Use **Random maze** to generate a new solvable
3-by-3 layout before asking the LLM agent to solve and replay it.

The replay renders the growing verified traversal graph in its own panel beside
the maze: room coordinates are vertices and successful traversals are edges.
Every automatic `graph` update is also recorded in the **Actions stream** below
the maze.

Rebuild the browser controller after changing the TypeScript implementation:

```text
bun build visualization/controller.ts --target browser --format iife --outfile visualization/app.js
```

The animation is also available through the global presentation API:

```javascript
mazeVisualizer.move("east");
mazeVisualizer.takeKey();
mazeVisualizer.unlockExit();
mazeVisualizer.setState({ x: 2, y: 1, hasKey: true });
mazeVisualizer.reset();
```

`move` accepts `north`, `east`, `south`, or `west`. The visualizer rejects maze
boundaries and the blocked center room so a failed movement can be displayed.
