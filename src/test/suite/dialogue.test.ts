import * as assert from 'assert';
import * as vscode from 'vscode';
import newDialogue, { Dialogue } from '../../dialogue';
import { content } from './tokenizer.test';

const expected: Dialogue = {
	options: {
		model: "davinci",
		skipMessageHeader: true,
	},
	system: {
		options: {
			role: "system",
		},
		content: "Hello, system!\n",
	},
	messages: [{
		options: {
			role: "user",
		},
	}, {
		options: {
			role: "assistant",
		},
		content: "Hello, assistant!",
	}, {
		options: {
			role: "user",
		},
		content: "Hello, user!\n",
	}]
};

suite('Dialogue Test Suite', () => {
	test('dialogue test', async () => {
		const document = await vscode.workspace.openTextDocument({content});
		const dialogue = newDialogue(document, {
			provider: "openai",
			model: "will-be-overwritten",
			messageHeader: true,
			systemPrompt: ""
		});
		assert.deepStrictEqual(dialogue, expected);
	});
});
