import * as vscode from 'vscode';

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

let _channel: vscode.OutputChannel;
export function getOutputChannel(): vscode.OutputChannel {
	if (!_channel) {
		_channel = vscode.window.createOutputChannel('noteGPT');
	}
	return _channel;
}
