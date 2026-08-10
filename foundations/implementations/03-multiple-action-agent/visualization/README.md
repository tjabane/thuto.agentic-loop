# Maze visualization

Open `index.html` in a browser. Its controls call the current TypeScript
`Agent` and `Environment` instances and then reflect their state in the maze.

Rebuild the browser controller after changing the TypeScript implementation:

```text
node_modules/.bin/esbuild foundations/implementations/03-multiple-action-agent/visualization/controller.ts --bundle --platform=browser --format=iife --outfile=foundations/implementations/03-multiple-action-agent/visualization/app.js
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
