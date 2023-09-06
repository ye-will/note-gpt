import type { Model, CompletionParams } from './models';
import { Agent } from 'http';
import OpenAI from './openai';
import Azure from './azure';
import type { ExtensionConfig } from '../config';

export type { CompletionParams };

export default function getModel(
  config: ExtensionConfig,
  token: string,
  model: string,
  agent?: Agent,
): Model {
  switch (config.provider) {
    case 'openai': {
      return new OpenAI(token, model, agent);
    }
    case 'azure': {
      if (!config.endpoint) {
        throw new Error("Endpoint is required for azure");
      }
      return new Azure(token, config.endpoint, model, agent);
    }
    default: {
      throw new Error(`Unknown provider: ${config.provider}`);
    }
  }
}
