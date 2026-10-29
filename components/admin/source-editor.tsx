"use client";
import { useEffect, useRef } from "react";
import { EditorView, keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import { basicSetup } from "codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { openSearchPanel } from "@codemirror/search";

export function SourceEditor({
  value,
  onChange,
  disabled = false,
  searchOpen = false,
  initialPosition,
  onSelectionChange,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  searchOpen?: boolean;
  initialPosition?: number;
  onSelectionChange?: (position: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const callback = useRef(onChange);
  const incoming = useRef(false);
  const selectionCallback = useRef(onSelectionChange);
  useEffect(() => {
    callback.current = onChange;
    selectionCallback.current = onSelectionChange;
  }, [onChange, onSelectionChange]);
  useEffect(() => {
    if (!host.current) return;
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          keymap.of([indentWithTab]),
          markdown(),
          EditorView.lineWrapping,
          EditorState.readOnly.of(disabled),
          EditorView.contentAttributes.of({ "aria-label": "Markdown 原始碼" }),
          EditorView.theme(
            {
              "&": {
                backgroundColor: "#0b1220",
                color: "#e4edf9",
                minHeight: "220px",
              },
              ".cm-content": {
                fontFamily: "monospace",
                fontSize: "14px",
                padding: "16px",
              },
              ".cm-gutters": {
                backgroundColor: "#101827",
                color: "#9eacc4",
                border: 0,
              },
              ".cm-cursor": { borderLeftColor: "#8ed2d8" },
              ".cm-scroller": { maxHeight: "65dvh", overflow: "auto" },
            },
            { dark: true },
          ),
          EditorView.updateListener.of((update) => {
            if (update.selectionSet || update.docChanged)
              selectionCallback.current?.(update.state.selection.main.head);
            if (update.docChanged && !incoming.current)
              callback.current(update.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = editor;
    if (initialPosition !== undefined) {
      const pos = Math.min(initialPosition, editor.state.doc.length);
      editor.dispatch({
        selection: { anchor: pos },
        effects: EditorView.scrollIntoView(pos, { y: "center" }),
      });
      editor.focus();
    }
    if (searchOpen) openSearchPanel(editor);
    return () => {
      editor.destroy();
      view.current = null;
    };
    // Recreate only when permission changes; ordinary external changes are transactions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);
  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== value) {
      incoming.current = true;
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: value },
      });
      incoming.current = false;
    }
  }, [value]);
  useEffect(() => {
    const editor = view.current;
    if (editor && initialPosition !== undefined) {
      const pos = Math.min(initialPosition, editor.state.doc.length);
      editor.dispatch({
        selection: { anchor: pos },
        effects: EditorView.scrollIntoView(pos, { y: "center" }),
      });
    }
  }, [initialPosition]);
  return <div className="source-editor" ref={host} />;
}
