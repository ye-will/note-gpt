import * as vscode from 'vscode';

const getDelimiter = (document: vscode.TextDocument) => document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';

export default class Editor {
	private editor: vscode.TextEditor;
	delimiter: string;

	constructor (editor: vscode.TextEditor) {
		this.editor = editor;
		this.delimiter = getDelimiter(editor.document);
	}

	private get currentLastLine() {
		const document = this.editor.document;
		return document.lineAt(document.lineCount - 1);
	}

	async appendWords(text: string) {
		return await this.editor.edit(editBuilder => {
			editBuilder.insert(this.currentLastLine.range.end, text);
		});
	}

	async appendLines(lines: string[], blankLine = true) {
		return await this.editor.edit(editBuilder => {
      const padding = (blankLine && !this.currentLastLine.isEmptyOrWhitespace) ? this.delimiter + this.delimiter : this.delimiter;
			editBuilder.insert(this.currentLastLine.range.end, padding + lines.join(this.delimiter));
		});
	}

	revealSavedLine(revealType?: vscode.TextEditorRevealType) {
		const lastRange = new vscode.Range(this.editor.document.lineCount, 0, this.editor.document.lineCount, 0);
		return this.editor.revealRange(lastRange, revealType ?? vscode.TextEditorRevealType.InCenter);
	}

  setCursorEnd() {
    this.editor.selection = new vscode.Selection(this.currentLastLine.range.end, this.currentLastLine.range.end);
    this.revealSavedLine(vscode.TextEditorRevealType.InCenterIfOutsideViewport);
  }
}
