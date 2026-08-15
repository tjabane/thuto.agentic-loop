# Maze visualization

Open `index.html` in a browser. The Run agent control calls `Agent.Run()`,
captures the resulting environment interactions, and replays them in the maze.

Rebuild the browser controller after changing the TypeScript implementation:

```text
node_modules/.bin/esbuild foundations/implementations/visualization/controller.ts --bundle --platform=browser --format=iife --outfile=foundations/implementations/visualization/app.js
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
