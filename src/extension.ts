// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import newDialogue, { formatMessage, withDialogue } from './dialogue';
import getModel from './models';
import getAgent from './agent';
import { getConfig, getSecret } from './config';
import Editor from './editor';
import { capitalize } from './utils';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	const getActiveEditor = () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showInformationMessage('No editor is active');
		}
		return editor;
	};

	const completion = async () => {
		const activeEditor = getActiveEditor();
		if (!activeEditor) {
			return;
		}
		const config = getConfig();
		const secret = getSecret(context);
		const key = await (secret.load().then(value => value, () => secret.set().then(() => secret.load())));
		const agent = getAgent(config.proxyURL);
		const dialogue = newDialogue(activeEditor.document, config);
		const model = getModel(config, key, dialogue.options.model, agent);
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: false,
			title: "Thinking..."
		}, async () => {
			const editor = new Editor(activeEditor);
			const params = withDialogue({messages: []}, dialogue);
			if (!model.completionsStreaming) {
				const message = await model.completions(params);
				await editor.appendLines(formatMessage({
					options: {
						role: message.role
					},
					content: (config.messageHeader ? `## ${capitalize(message.role)}\n\n` : "\n") + message.content
				}));
				return;
			}
			for await (const delta of model.completionsStreaming(params)) {
				if (delta.role !== undefined) {
					await editor.appendLines(formatMessage({
						options: {
							role: delta.role
						},
						content: config.messageHeader ? `## ${capitalize(delta.role)}\n\n` : "\n"
					}));
					editor.revealSavedLine();
				}
				if (delta.content !== undefined) {
					await editor.appendWords(delta.content);
				}
			}
		});
	};

	const newUserMessage = async () => {
		const activeEditor = getActiveEditor();
		if (!activeEditor) {
			return;
		}
		const config = getConfig();
		const editor = new Editor(activeEditor);
		await editor.appendLines(formatMessage({
			options: {
				role: "user"
			},
			content: config.messageHeader ? "## User\n\n" : "\n"
		}));
		editor.setCursorEnd();
	};

	const setApiKeyCommand = vscode.commands.registerCommand('note-gpt.set-api-key', () => {
		const secret = getSecret(context);
		secret.set().then(() => undefined, reason => {
			vscode.window.showErrorMessage(reason.toString());
		});
	});

	const clearApiKeyCommand = vscode.commands.registerCommand('note-gpt.clear-api-key', () => {
		const secret = getSecret(context);
		secret.clear();
	});

	const completionCommand = vscode.commands.registerCommand('note-gpt.completion', () => {
		completion().then(() => undefined, reason => {
			vscode.window.showErrorMessage(reason.toString());
		});
	});

	const newUserMessageCommand = vscode.commands.registerCommand('note-gpt.new-user-message', () => {
		newUserMessage();
	});

	const newDialogueCommand = vscode.commands.registerCommand('note-gpt.new-dialogue', () => {
		const config = getConfig();
		vscode.workspace.openTextDocument()
			.then(document => vscode.window.showTextDocument(document))
			.then(activeEditor => new Editor(activeEditor))
			.then(editor => editor.appendWords(formatMessage({
				options: {
					role: "system"
				},
				content: (config.messageHeader ? "## System\n\n" : "\n") + config.systemPrompt
			}).join(editor.delimiter))).then(() => newUserMessage());
	});

	context.subscriptions.push(
		completionCommand,
		newUserMessageCommand,
		setApiKeyCommand,
		clearApiKeyCommand,
		newDialogueCommand
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
