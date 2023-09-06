import fetch, { Response } from "node-fetch";
import type { Agent } from "http";
import { createParser } from 'eventsource-parser';
import type { Model, Message, MessageDelta, CompletionParams } from './models';
import { getOutputChannel } from '../utils';

type CompletionResponse = {
  choices: {
    message: Message
  }[]
};

function isCompletionResponse(obj: unknown): obj is CompletionResponse {
  return obj !== undefined && obj !== null && (obj as CompletionResponse).choices !== undefined;
}

type CompletionStreamingResponse = {
  choices: {
    delta: MessageDelta
    // eslint-disable-next-line @typescript-eslint/naming-convention
    finish_reason?: string | null
  }[]
};

function isCompletionStreamingResponse(obj: unknown): obj is CompletionStreamingResponse {
  return obj !== undefined && obj !== null && (obj as CompletionStreamingResponse).choices !== undefined;
}

export class OpenAILike implements Model {
  protected async completionsRequest(d: CompletionParams, stream: boolean): Promise<Response> {
    throw new Error("Not implemented");
  }

  async completions(d: CompletionParams): Promise<Message> {
    const response = await this.completionsRequest(d, false);
    const json = await response.json();
    if (!isCompletionResponse(json)) {
      throw new Error("Unexpected response");
    }
    return json.choices[0].message;
  }

  async completionsStreaming(d: CompletionParams, cb: (delta: MessageDelta) => Promise<void>): Promise<void> {
    const response = await this.completionsRequest(d, true);
    if (!response.body) {
      throw new Error("Unexpected response");
    }
    const deltas: MessageDelta[] = [];
    const parser = createParser(event => {
      if (event.type === 'event') {
        if (event.data === '[DONE]') {
          return;
        }
        const data = JSON.parse(event.data);
        if (!isCompletionStreamingResponse(data)) {
          throw new Error("Unexpected response");
        }
        if (data.choices.length === 0) {
          return;
        }
        if (data.choices[0].finish_reason === "stop") {
          return;
        }
        deltas.push(data.choices[0].delta);
      }
    });
    const decoder = new TextDecoder();
    for await (const chunk of response.body) {
      const data = decoder.decode(chunk as Buffer);
      parser.feed(data);
      while (deltas.length > 0) {
        await cb(deltas.shift() as MessageDelta);
      }
    }
    return;
  }
}

export default class OpenAI extends OpenAILike {
  constructor(private token: string, private model: string, private agent?: Agent) {
    super();
  }

  protected override async completionsRequest(d: CompletionParams, stream: boolean): Promise<Response> {
    const messages = [
      ...(d.system !== undefined ? [{"role": "system", "content": d.system}] : []),
      ...d.messages];
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        "Content-Type": "application/json",
        // eslint-disable-next-line @typescript-eslint/naming-convention
        "Authorization": "Bearer " + this.token,
      },
      body: JSON.stringify({
        "model": this.model,
        messages,
        ...(d.temperature ? {temperature: d.temperature} : {}),
        ...(stream ? {stream: true} : {})
      }),
      agent: this.agent
    });
    if (response.status !== 200) {
      const channel = getOutputChannel();
      channel.appendLine(`OpenAI Error: ${response.status}, Body: ${await response.text()}`);
      channel.show();
      throw new Error("OpenAI API Error");
    }
    return response;
  }
}
