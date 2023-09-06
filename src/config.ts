import * as vscode from 'vscode';

const DEFAULT_SYSTEM_PROMPT = "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown.";

export type ExtensionConfig = {
  provider: string;
  model: string;
  systemPrompt: string;
  temperature?: number;
  endpoint?: string;
  messageHeader: boolean;
  proxyURL?: string;
};

export function getConfig(): ExtensionConfig {
  const configuration = vscode.workspace.getConfiguration("noteGPT");
  const model = configuration.get<string>("model");
  const provider = configuration.get<string>("provider");
  if (provider === undefined || model === undefined) {
    throw new Error("configuration error");
  }
  const temperature = configuration.get<number>("temperature");
  const endpoint = configuration.get<string>("endpoint");
  const messageHeader = configuration.get<boolean>("messageHeader");
  const proxyURL = configuration.get<string>("proxyURL") || undefined;
  const systemPrompt = configuration.get<string>("systemPrompt") || DEFAULT_SYSTEM_PROMPT;
  return {
    provider,
    model,
    temperature,
    endpoint,
    systemPrompt: systemPrompt,
    messageHeader: messageHeader ?? false,
    proxyURL
  };
}

const SECRET_KEY = "note-gpt.api-key";

export function getSecret(context: vscode.ExtensionContext) {
  const set = () => vscode.window.showInputBox({
		title: "Set API Key",
		placeHolder: "sk-************************************************",
	}).then(value => {
		if (value === undefined || value.length === 0) {
			return Promise.reject<void>(new Error("No API key provided"));
		}
		return context.secrets.store(SECRET_KEY, value);
	});

	const load = () => context.secrets.get(SECRET_KEY).then(value => {
		if (value === undefined || value.length === 0) {
			return Promise.reject<string>(new Error("No API key found"));
		}
		return value;
	});

  const clear = () => context.secrets.delete(SECRET_KEY);

  return {
    set,
    load,
    clear
  };
}
