# Maze visualization

Open `index.html` in a browser. The Run agent control calls `Agent.Run()`,
captures the resulting environment interactions, and replays them in the maze.
Use **Random maze** to generate a new solvable 3-by-3 layout with randomized
key, exit, and blocked-cell positions before running the agent.

Rebuild the browser controller after changing the TypeScript implementation:

```text
node_modules/.bin/esbuild visualization/controller.ts --bundle --platform=browser --format=iife --outfile=visualization/app.js
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
