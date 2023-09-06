import * as assert from 'assert';
import * as vscode from 'vscode';
import tokenizer from '../../tokenizer';

export const content = `---
model: davinci
---

<!-- {role: system}   -->
Hello, system!

<!-- {role: user} -->
<!--
role: assistant
-->
Hello, assistant!
<!-- {role: user} -->
## HEADER

Hello, user!
`;

const expected =  [{
	text: [
		'---',
		'model: davinci',
		'---',
		''
	],
	type: 'Header',
	value: [
		'model: davinci'
	]
}, {
	text: [
		'<!-- {role: system}   -->'
	],
	type: 'Meta',
	value: [
		'{role: system}'
	]
}, {
	text: [
		'Hello, system!',
		''
	],
	type: 'Content',
	value: [
		'Hello, system!',
		''
	]
}, {
	text: [
		'<!-- {role: user} -->'
	],
	type: 'Meta',
	value: [
		'{role: user}'
	]
}, {
	text: [
		'<!--',
		'role: assistant',
		'-->'
	],
	type: 'Meta',
	value: [
		'role: assistant'
	]
}, {
	text: [
		'Hello, assistant!'
	],
	type: 'Content',
	value: [
		'Hello, assistant!'
	]
}, {
	text: [
		'<!-- {role: user} -->'
	],
	type: 'Meta',
	value: [
		'{role: user}'
	]
}, {
	text: [
		'## HEADER',
		'',
		'Hello, user!',
		''
	],
	type: 'Content',
	value: [
		'## HEADER',
		'',
		'Hello, user!',
		''
	]
}];

suite('Tokenizer Test Suite', () => {
	test('tokenizer test', async () => {
		const document = await vscode.workspace.openTextDocument({content});
		const sections = tokenizer(document);
		assert.deepStrictEqual(sections, expected);
	});
});
