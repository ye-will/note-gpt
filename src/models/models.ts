export type Message = {
  role: string;
  content: string;
};

export type MessageDelta = {
  role?: string;
  content?: string;
};

export type CompletionParams = {
  temperature?: number;
  system?: string;
  messages: Message[];
};

export type Model = {
  completions(params: CompletionParams, ac?: AbortController): Promise<Message>;
  completionsStreaming?(params: CompletionParams, ac?: AbortController): AsyncIterable<MessageDelta>;
};
