import * as yaml from "js-yaml";
import tokenizer, { type Section, SectionType, newMetaSectionInline } from "./tokenizer";
import { ExtensionConfig } from './config';
import { TextDocument } from 'vscode';
import { CompletionParams } from "./models";

type MessageOptions = {
  role: string;
};

function isOptionsBuilder<T extends {}>(kv: Record<string, string>, required: string[] = []): (token: any) => token is T {
  const typeKeys = Object.keys(kv);
  return (token: any): token is T => {
    if (typeof token !== "object" || token === null) {
      return false;
    }
    const tokenKeys = Object.keys(token);
    for (const requiredKey of required) {
      if (!tokenKeys.includes(requiredKey)) {
        return false;
      }
    }
    for (const tokenKey of tokenKeys) {
      if (!typeKeys.includes(tokenKey)) {
        return false;
      }
      if (typeof token[tokenKey] !== kv[tokenKey]) {
        return false;
      }
    }
    return true;
  };
}

const isMessageOptions = isOptionsBuilder<MessageOptions>({
  "role": "string"
}, ["role"]);

type OptionalDialogueOptions = {
  skipMessageHeader?: boolean;
  model?: string;
  temperature?: number;
};

const isOptionalDialogueOptions = isOptionsBuilder<DialogueOptions>({
  "skipMessageHeader": "boolean",
  "model": "string",
  "temperature": "number",
});

type DialogueOptions = {
  model: string;
} & OptionalDialogueOptions;

export type DialogueMessage = {
  options: MessageOptions;
  content?: string;
};

export type Dialogue = {
  options: DialogueOptions;
  system?: DialogueMessage;
  messages: DialogueMessage[];
};

function configOptions(extensionConfig: ExtensionConfig): DialogueOptions {
  return {
    skipMessageHeader: extensionConfig.messageHeader === true,
    temperature: extensionConfig.temperature,
    model: extensionConfig.model,
  };
}

function parseHeader(sections: Section[]): [OptionalDialogueOptions, Section[]] {
  if (sections[0].type !== SectionType.header) {
    return [{}, sections];
  }
  const opt = yaml.load(sections[0].value.length > 0 ? sections[0].value.join("\n") : "{}");
  if (!isOptionalDialogueOptions(opt)) {
    throw new Error("invalid dialogue header");
  }
  return [opt, sections.slice(1)];
}

function parseMessage(sections: Section[], dialogueOptions: DialogueOptions): [DialogueMessage | undefined, Section[]] {
  if (sections.length === 0) {
    return [undefined, []];
  }
  if (sections[0].type !== SectionType.meta) {
    return [undefined, sections];
  }
  const options = yaml.load(sections[0].value.join("\n") ?? "{}");
  if (!isMessageOptions(options)) {
    throw new Error("invalid message options");
  }
  if (sections.length === 1) {
    return [{ options }, []];
  }
  if (sections[1].type !== SectionType.content) {
    return [{ options }, sections.slice(1)];
  }
  const lines = [...sections[1].value];
  if (dialogueOptions.skipMessageHeader) {
    while (lines.length > 0 && (lines[0].trim() === "" || lines[0].startsWith("## "))) {
      lines.shift();
    }
  }
  const content = lines.join("\n");
  return [{ options, content }, sections.slice(2)];
}

export default function newDialogue(text: TextDocument, extensionConfig: ExtensionConfig): Dialogue {
  const sections = tokenizer(text);
  if (sections.length === 0) {
    throw new Error("empty document");
  }
  const [headerOptions, messageSections] = parseHeader(sections);
  const options = {
    ...configOptions(extensionConfig),
    ...headerOptions
  };
  const messages: DialogueMessage[] = [];
  let rest = messageSections;
  while (true) {
    const [message, next] = parseMessage(rest, options);
    if (message === undefined) {
      if (next.length > 0) {
        throw new Error("invalid message");
      }
      break;
    }
    messages.push(message);
    rest = next;
  }
  if (messages.length === 0) {
    return {options, messages: []};
  }
  const system = messages[0].options.role === "system" ? messages.shift() : undefined;
  if (messages.filter(m => m.options.role === "system").length > 0) {
    throw new Error("multiple system messages is not allowed");
  }
  return {options, system, messages};
}

export function formatMessage(message: DialogueMessage): string[] {
  const meta = newMetaSectionInline(`{role: ${message.options.role}}`);
  const content = message.content !== undefined ? message.content.split("\n") : [];
  return [...meta.text, ...content];
}

export function withDialogue(prev: CompletionParams, dialogue: Dialogue): CompletionParams {
  // override prev
  const messages = dialogue.messages.map(m => ({role: m.options.role, content: m.content ?? ""}));
  const system = dialogue.system !== undefined ? dialogue.system.content: "";
  // merge
  const temperature = dialogue.options.temperature ?? prev.temperature;
  return {
    ...prev,
    messages,
    system,
    temperature,
  };
}
