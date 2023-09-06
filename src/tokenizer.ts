import { TextDocument } from 'vscode';

export enum TokenType {
  yamlHeader = "---",
  htmlCommentStart = "<!--",
  htmlCommentEnd = "-->",
}

export enum SectionType {
  header = "Header",
  meta = "Meta",
  content = "Content",
}

type SectionNode<T extends SectionType> = {
  type: T;
  text: string[];
  value: string[];
};

export type Section =
  SectionNode<SectionType.header> |
  SectionNode<SectionType.meta> |
  SectionNode<SectionType.content>;

const updateSectionValue = (s: Section, line: string) => {
  return {
    ...s,
    text: s.text.concat(line),
    value: s.value.concat(line)
  };
};

enum TokenizerState {
  headerStart,
  header,
  headerPost,
  metaStart,
  meta,
  contentStart,
  content,
}

type Tokenizer = {
  state: TokenizerState;
  sections: Section[];
};

function tokenLine(prev: Tokenizer, line: string): Tokenizer {
  switch (prev.state) {
    case TokenizerState.headerStart: {
      if (line === TokenType.yamlHeader) {
        return {
          state: TokenizerState.header,
          sections: [{
            type: SectionType.header,
            text: [line],
            value: []
          }]
        };
      }
      return tokenLine({
        state: TokenizerState.metaStart,
        sections: []
      }, line);
    }
    case TokenizerState.header: {
      if (line === TokenType.yamlHeader) {
        return {
          state: TokenizerState.headerPost,
          sections: [{
            ...prev.sections[0],
            text: [...prev.sections[0].text, line]
          }]
        };
      }
      return {
        state: TokenizerState.header,
        sections: [updateSectionValue(prev.sections[0], line)]
      };
    }
    case TokenizerState.headerPost: {
      if (line.startsWith(TokenType.htmlCommentStart)) {
        return tokenLine({
          ...prev,
          state: TokenizerState.metaStart
        }, line);
      }
      if (line.trim() !== "") {
        throw new Error("unexpected content after header");
      }
      return {
        state: TokenizerState.headerPost,
        sections: [{
          ...prev.sections[0],
          text: [...prev.sections[0].text, line]
        }]
      };
    }
    case TokenizerState.metaStart: {
      if (!line.startsWith(TokenType.htmlCommentStart)) {
        throw new Error(`meta must start with ${TokenType.htmlCommentStart}`);
      }
      const rest = line.slice(TokenType.htmlCommentStart.length).trim();
      if (rest === "") {
        return {
          state: TokenizerState.meta,
          sections: [
            ...prev.sections,
            {
              type: SectionType.meta,
              text: [line],
              value: []
            }
          ]
        };
      }
      if (!rest.endsWith(TokenType.htmlCommentEnd)) {
        throw new Error(`inline meta must end with ${TokenType.htmlCommentEnd}`);
      }
      return {
        state: TokenizerState.contentStart,
        sections: [...prev.sections, {
          type: SectionType.meta,
          text: [line],
          value: [rest.slice(0, rest.length - TokenType.htmlCommentEnd.length).trim()]
        }]
      };
    }
    case TokenizerState.meta: {
      const lastSection = prev.sections[prev.sections.length - 1];
      if (line === TokenType.htmlCommentEnd) {
        return {
          state: TokenizerState.contentStart,
          sections: prev.sections.slice(0, prev.sections.length - 1).concat({
            ...lastSection,
            text: [...lastSection.text, line]
          }),
        };
      }
      if (line.endsWith(TokenType.htmlCommentEnd)) {
        throw new Error(`meta ending(${TokenType.htmlCommentEnd}) must be on a individual line`);
      }
      return {
        state: TokenizerState.meta,
        sections: prev.sections.slice(0, prev.sections.length - 1).concat(updateSectionValue(lastSection, line))
      };
    }
    case TokenizerState.contentStart: {
      if (line.startsWith(TokenType.htmlCommentStart)) {
        return tokenLine({
          ...prev,
          state: TokenizerState.metaStart
        }, line);
      }
      return tokenLine({
        state: TokenizerState.content,
        sections: [
          ...prev.sections,
          {
            type: SectionType.content,
            text: [],
            value: []
          }
        ]
      }, line);
    }
    case TokenizerState.content: {
      if (line.startsWith(TokenType.htmlCommentStart)) {
        return tokenLine({
          state: TokenizerState.metaStart,
          sections: prev.sections
        }, line);
      }
      const lastSection = prev.sections[prev.sections.length - 1];
      return {
        state: TokenizerState.content,
        sections: prev.sections.slice(0, prev.sections.length - 1).concat(updateSectionValue(lastSection, line))
      };
    }
  }
}

export default function tokenizer(doc: TextDocument): Section[] {
  let prev: Tokenizer = {
    state: TokenizerState.headerStart,
    sections: []
  };
  for (let i = 0; i < doc.lineCount; i++) {
    const line = doc.lineAt(i).text;
    prev = tokenLine(prev, line);
  }
  if (prev.state !== TokenizerState.content && prev.state !== TokenizerState.contentStart) {
    throw new Error("unexpected end of document");
  }
  return prev.sections;
}

export function newMetaSectionInline(line: string): Section {
  return {
    type: SectionType.meta,
    text: [`${TokenType.htmlCommentStart} ${line} ${TokenType.htmlCommentEnd}`],
    value: [line]
  };
}
