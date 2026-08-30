import { DIRECTIONS } from "../models/position.js";
import type { ToolInputPrimitive, ToolInputPropertySchema, ToolInputSchema } from "./tool-contracts.js";

/** Schema for tools that do not accept any arguments. */
const EMPTY_TOOL_INPUT_SCHEMA = {
    type: "object",
    properties: {},
    additionalProperties: false,
} as const satisfies ToolInputSchema;

/** Schema for a request to move one cell in a cardinal direction. */
const MOVE_TOOL_INPUT_SCHEMA = {
    type: "object",
    properties: { direction: { type: "string", enum: DIRECTIONS } },
    required: ["direction"],
    additionalProperties: false,
} as const satisfies ToolInputSchema;

/**
 * Validates raw model arguments against a tool input schema.
 *
 * The validator deliberately supports the primitive JSON Schema features used
 * by tools: object shape, required properties, primitive property types, and
 * enums. Add a property schema type here before introducing a more complex
 * tool argument shape.
 */
function isValidToolInput(input: unknown, schema: ToolInputSchema): input is Readonly<Record<string, ToolInputPrimitive>> {
    if (!isRecord(input) || !hasRequiredProperties(input, schema)) {
        return false;
    }

    return Object.entries(input).every(([name, value]) => {
        const propertySchema = schema.properties[name];
        return propertySchema !== undefined && isValidPropertyValue(value, propertySchema);
    });
}

function hasRequiredProperties(input: Record<string, unknown>, schema: ToolInputSchema): boolean {
    return schema.required?.every(name => Object.hasOwn(input, name)) ?? true;
}

function isValidPropertyValue(value: unknown, schema: ToolInputPropertySchema): boolean {
    if (
        !isToolInputPrimitive(value) ||
        typeof value !== schema.type ||
        (schema.type === "number" && !Number.isFinite(value))
    ) {
        return false;
    }

    return schema.enum === undefined || schema.enum.includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isToolInputPrimitive(value: unknown): value is ToolInputPrimitive {
    return typeof value === "boolean" || typeof value === "number" || typeof value === "string";
}

export { EMPTY_TOOL_INPUT_SCHEMA, isValidToolInput, MOVE_TOOL_INPUT_SCHEMA };
