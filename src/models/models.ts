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
  completions(params: CompletionParams): Promise<Message>;
  completionsStreaming?(params: CompletionParams, cb: (delta: MessageDelta) => Promise<void>): Promise<void>;
};
