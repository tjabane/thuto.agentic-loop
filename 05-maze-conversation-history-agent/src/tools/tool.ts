/** The result returned to the model after a tool execution attempt. */
type ToolResult<Output = unknown> =
    | { success: true; output: Output }
    | { success: false; error: string };

/** A model-facing capability that the harness can validate and execute. */
type Tool<Output = unknown> = {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    execute(input: unknown): ToolResult<Output> | Promise<ToolResult<Output>>;
};

export type { Tool, ToolResult };
