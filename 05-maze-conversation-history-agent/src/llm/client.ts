import OpenAI from "openai";

/** Model output items that can be replayed in the next request. */
type LLMOutputItem =
    | OpenAI.Responses.ResponseOutputMessage
    | OpenAI.Responses.ResponseReasoningItem
    | OpenAI.Responses.ResponseFunctionToolCall;

/** The portion of a model response needed by the agent harness. */
type LLMResponse = {
    output: LLMOutputItem[];
    outputText: string;
};

/** Contract used by the agent to continue a tool-using conversation. */
interface ILLMClient {
    /**
     * Requests the model's next message or function call.
     *
     * @param input - Conversation context accumulated by the harness.
     * @param tools - Function tools currently available to the model.
     * @returns Replayable model output and any final response text.
     */
    getResponse(
        input: OpenAI.Responses.ResponseInput,
        tools: OpenAI.Responses.FunctionTool[],
    ): Promise<LLMResponse>;
}

/** Configuration for {@link LLMClient}. */
type LLMClientOptions = {
    /** API key used by the OpenAI SDK. */
    apiKey?: string;

    /** Model used for each conversation turn. */
    model?: string;

    /** Optional SDK client override for isolated tests. */
    client?: Pick<OpenAI, "responses">;
};

/** OpenAI Responses API implementation of the agent's model contract. */
class LLMClient implements ILLMClient {
    private readonly client: Pick<OpenAI, "responses">;
    private readonly model: string;

    /**
     * Creates a model client.
     *
     * @param options - Model, credentials, and optional SDK dependency.
     */
    constructor(options: LLMClientOptions = {}) {
        this.client =
            options.client ??
            new OpenAI(options.apiKey ? { apiKey: options.apiKey } : {});
        this.model = options.model ?? process.env.OPENAI_MODEL ?? "gpt-5";
    }

    /** {@inheritDoc ILLMClient.getResponse} */
    public async getResponse(
        input: OpenAI.Responses.ResponseInput,
        tools: OpenAI.Responses.FunctionTool[],
    ): Promise<LLMResponse> {
        const response = await this.client.responses.create({
            model: this.model,
            input,
            tools,
            tool_choice: "auto",
            parallel_tool_calls: false,
            store: false,
        });

        const output: LLMOutputItem[] = [];

        for (const item of response.output) {
            if (
                item.type === "message" ||
                item.type === "reasoning" ||
                item.type === "function_call"
            ) {
                output.push(item);
            }
        }

        return { output, outputText: response.output_text };
    }
}

export {
    type ILLMClient,
    LLMClient,
    type LLMClientOptions,
    type LLMOutputItem,
    type LLMResponse,
};
