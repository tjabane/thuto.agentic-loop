/**
 * JSON Schema describing the object passed to an environment tool.
 *
 * The schema is the single source of truth for tool arguments. The LLM client
 * passes it to the LLM to describe a tool call, and the tool uses it again to
 * validate the untrusted arguments returned by the LLM.
 *
 * All tool arguments use an object as their outer container. A tool that
 * requires no input still uses `{}` with empty `properties` and
 * `additionalProperties: false`.
 */
type ToolInputPrimitive = boolean | number | string;

/** A JSON value accepted as a tool argument. */
type ToolInputValue = ToolInputPrimitive | readonly ToolInputPrimitive[];

/** Schema for one primitive tool argument. */
interface ToolInputPrimitivePropertySchema {
    /** JSON primitive type accepted for this argument. */
    readonly type: "boolean" | "number" | "string";

    /** Optional finite set of permitted values. */
    readonly enum?: readonly ToolInputPrimitive[];
}

/** Schema for an array whose elements are primitive values. */
interface ToolInputArrayPropertySchema {
    readonly type: "array";
    readonly items: ToolInputPrimitivePropertySchema;
}

/** Schema for one supported tool argument. */
type ToolInputPropertySchema =
    | ToolInputArrayPropertySchema
    | ToolInputPrimitivePropertySchema;

interface ToolInputSchema {
    /**
     * Declares the top-level JSON Schema type for this tool's arguments.
     *
     * Every tool call is represented by one JSON object: either an empty
     * object for an inputless tool such as `observe`, or an object containing
     * the named fields described by {@link properties}. The value is fixed to
     * `"object"` so the LLM and the tool validator reject primitives, arrays,
     * and `null` before an environment interaction can occur.
     */
    readonly type: "object";

    /** Describes each permitted argument by name. */
    readonly properties: Readonly<Record<string, ToolInputPropertySchema>>;

    /** Names arguments that must be present in the input object. */
    readonly required?: readonly string[];

    /** Rejects arguments that the tool has not explicitly defined. */
    readonly additionalProperties: false;
}

/**
 * Verified outcome of a tool request.
 *
 * This result is the environment's contribution to the conversation history.
 * It reports what actually happened rather than what the LLM expected to
 * happen.
 */
interface ToolResult {
    /** Whether the environment accepted and completed the requested action. */
    readonly success: boolean;

    /** Human- and model-readable account of the verified outcome. */
    readonly message: string;

    /** Optional structured observation or result data safe to share with the LLM. */
    readonly data?: Readonly<Record<string, unknown>>;
}

/**
 * Describes a capability exposed by the agent body.
 *
 * A tool represents one permitted environment interaction, such as observing
 * the maze or attempting to move. It supplies its definition to the LLM, then
 * independently validates the LLM's requested arguments before interacting
 * with the environment. Its implementation belongs to the environment
 * boundary, not to the agent loop.
 */
interface Tool {
    /** Stable identifier used by the LLM when requesting this capability. */
    readonly name: string;

    /** Explains to the LLM when and how this capability should be used. */
    readonly description: string;

    /** Defines the input the LLM may request and the tool must validate. */
    readonly inputSchema: ToolInputSchema;

    /**
     * Validates untrusted LLM input and returns the environment's verified result.
     *
     * @param input - Raw arguments returned by the LLM; they must not be used
     * directly until the tool has validated them against {@link inputSchema}.
     */
    execute(input: unknown): Promise<ToolResult>;
}

export type {
    Tool,
    ToolInputArrayPropertySchema,
    ToolInputPrimitive,
    ToolInputPrimitivePropertySchema,
    ToolInputPropertySchema,
    ToolInputSchema,
    ToolInputValue,
    ToolResult,
};
