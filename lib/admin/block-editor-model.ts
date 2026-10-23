import { splitMarkdownBlocks } from "./markdown-blocks";
export type EditorBlock = { id: string; text: string; before: string };
export type EditorDocument = { blocks: EditorBlock[]; tail: string };
let sequence = 0;
export const newBlock = (text = "", before = "\n\n"): EditorBlock => ({ id: `block-${++sequence}`, text, before });
// Preserve separators verbatim; never reparse a draft on every keystroke.
export function readDocument(source: string): EditorDocument {
  let offset = 0;
  const blocks: EditorBlock[] = [];
  for (const text of splitMarkdownBlocks(source)) {
    const start = source.indexOf(text, offset);
    if (start < 0) return { blocks: [newBlock(source, "")], tail: "" };
    blocks.push(newBlock(text, source.slice(offset, start)));
    offset = start + text.length;
  }
  return { blocks, tail: source.slice(offset) };
}
export const writeDocument = (document: EditorDocument) => document.blocks.map((block) => block.before + block.text).join("") + document.tail;
export function insertBlock(document: EditorDocument, index: number, text = "") {
  const blocks = [...document.blocks];
  const block = newBlock(text, index === 0 ? "" : "\n\n");
  if (index === 0 && blocks[0]) blocks[0] = { ...blocks[0], before: "\n\n" + blocks[0].before };
  blocks.splice(index, 0, block);
  return { document: { ...document, blocks }, id: block.id };
}
export function splitBlock(document: EditorDocument, index: number, start: number, end = start) {
  const block = document.blocks[index];
  const blocks = [...document.blocks];
  const next = newBlock(block.text.slice(end));
  blocks.splice(index, 1, { ...block, text: block.text.slice(0, start) }, next);
  return { document: { ...document, blocks }, id: next.id };
}
export function mergeBlock(document: EditorDocument, index: number) {
  if (index <= 0) return null;
  const previous = document.blocks[index - 1];
  const block = document.blocks[index];
  const blocks = [...document.blocks];
  blocks.splice(index - 1, 2, { ...previous, text: previous.text + block.text });
  return { document: { ...document, blocks }, id: previous.id, caret: previous.text.length };
}
export function usesLiteralEnter(text: string) {
  return /(^|\n)(?:\s*(?:`{3,}|~{3,}|\$\$)| {4}|\t|\s*>|\s*(?:[-+*]|\d+[.)])\s|\s*\|)/.test(text)
    || /^ {0,3}\|?\s*:?-+:?\s*\|[|:\s-]*$/m.test(text);
}

export function canHandleBlockKey(event: { isComposing: boolean; keyCode: number; ctrlKey: boolean; metaKey: boolean; altKey: boolean }, composing: boolean) {
  return !composing && !event.isComposing && event.keyCode !== 229 && !event.ctrlKey && !event.metaKey && !event.altKey;
}
