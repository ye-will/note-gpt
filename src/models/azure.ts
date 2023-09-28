import fetch, { Response } from "node-fetch";
import type { Agent } from "http";
import type { CompletionParams } from './models';
import { OpenAILike } from './openai';
import { getOutputChannel } from '../utils';

export default class Azure extends OpenAILike {
  constructor(
    private token: string,
    private endpoint: string,
    private model: string,
    private agent?: Agent
  ) {
    super();
  }

  protected override async completionsRequest(d: CompletionParams, stream: boolean, ac?: AbortController): Promise<Response> {
    const messages = [
      ...(d.system !== undefined ? [{"role": "system", "content": d.system}] : []),
      ...d.messages];
    const url = `${this.endpoint}/openai/deployments/${this.model}/chat/completions?api-version=2023-08-01-preview`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        "Content-Type": "application/json",
        // eslint-disable-next-line @typescript-eslint/naming-convention
        "Api-Key": this.token,
      },
      body: JSON.stringify({
        messages,
        ...(d.temperature ? {temperature: d.temperature} : {}),
        ...(stream ? {stream: true} : {})
      }),
      agent: this.agent,
      signal: ac?.signal
    });
    if (response.status !== 200) {
      const channel = getOutputChannel();
      channel.appendLine(`Azure OpenAI Error: ${response.status}, Body: ${await response.text()}`);
      channel.show();
      throw new Error("Azure OpenAI API Error");
    }
    return response;
  }
}
