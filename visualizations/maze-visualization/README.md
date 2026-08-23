# Solution 04: Maze LLM agent visualization

The visualization runs the LLM agent on a local server so the OpenAI API key is
never exposed to browser JavaScript. Start it from the repository root:

```text
npm run visualization:start
```

Then open `http://localhost:3000`. Use **Random maze** to generate a new solvable
3-by-3 layout before asking the LLM agent to solve and replay it.

Rebuild the browser controller after changing the TypeScript implementation:

```text
npm run visualization:build
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
