"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Extension, Node, mergeAttributes } from "@tiptap/core";
import {
  EditorContent,
  ReactNodeViewRenderer,
  NodeViewWrapper,
  useEditor,
  useEditorState,
  type NodeViewProps,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import Placeholder from "@tiptap/extension-placeholder";
import {
  parseDocumentMarkdown,
  serializeDocumentMarkdown,
  withDocumentBaselines,
} from "@/lib/admin/document-markdown";
import { SourceEditor } from "@/components/admin/source-editor";
const EmbedContext = createContext({
  url: "/api/admin/preview",
  slug: "working-copy",
  draftId: "",
  disabled: false,
});

function RawView({ node, updateAttributes, selected }: NodeViewProps) {
  const [edit, setEdit] = useState(false);
  const [html, setHtml] = useState("");
  const context = useContext(EmbedContext);
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const controller = new AbortController();
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        const content = String(node.attrs.raw).replace(
          /assets\/(workspace-[a-f0-9-]+\.(?:png|jpg|webp|gif|avif|mp4))/g,
          (all, name: string) =>
            name.startsWith(`workspace-${context.draftId}-`)
              ? `/api/admin/working-copies/${context.draftId}/assets/${name}`
              : all,
        );
        fetch(context.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            slug: context.slug || "working-copy",
          }),
          signal: controller.signal,
        })
          .then((r) => r.json())
          .then((result) => {
            if (!controller.signal.aborted)
              setHtml(result.ok ? result.data.html : "");
          })
          .catch(() => {});
      },
      { rootMargin: "200px" },
    );
    observer.observe(host.current);
    return () => {
      observer.disconnect();
      controller.abort();
    };
  }, [node.attrs.raw, context]);
  let chart: Record<string, unknown> | null = null;
  try {
    if (String(node.attrs.raw).startsWith("```chart"))
      chart = JSON.parse(
        String(node.attrs.raw)
          .replace(/^```chart\s*\n/, "")
          .replace(/\n```\s*$/, ""),
      ) as Record<string, unknown>;
  } catch {}
  return (
    <NodeViewWrapper
      className={`composer-raw ${selected ? "is-selected" : ""}`}
    >
      <div contentEditable={false} ref={host}>
        <strong>
          {String(node.attrs.raw).startsWith("```mermaid")
            ? "流程圖"
            : String(node.attrs.raw).startsWith("```chart")
              ? "統計圖"
              : "Markdown 嵌入"}
        </strong>
        <button type="button" onClick={() => setEdit(!edit)}>
          {edit ? "完成" : "編輯原文"}
        </button>
        {edit ? (
          <>
            {chart && (
              <div className="composer-chart-settings">
                <label>
                  圖表類型
                  <select
                    value={String(chart.type)}
                    onChange={(e) =>
                      updateAttributes({
                        raw: `\`\`\`chart\n${JSON.stringify({ ...chart, type: e.target.value }, null, 2)}\n\`\`\``,
                      })
                    }
                  >
                    <option value="bar">柱狀圖</option>
                    <option value="pie">圓餅圖</option>
                    <option value="line">折線圖</option>
                  </select>
                </label>
                <small>
                  請使用真實 labels 與 series.values；資料不完整時僅保留工作稿。
                </small>
              </div>
            )}
            <SourceEditor
              value={node.attrs.raw}
              disabled={context.disabled}
              onChange={(raw) => updateAttributes({ raw })}
            />
          </>
        ) : html ? (
          <div
            className="prose-content"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <pre>{node.attrs.raw}</pre>
        )}
      </div>
    </NodeViewWrapper>
  );
}
export const RawMarkdown = Node.create({
  name: "rawMarkdown",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return { raw: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "div[data-raw-markdown]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-raw-markdown": "true" }),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(RawView);
  },
});
export const SourceTrivia = Extension.create({
  name: "sourceTrivia",
  addGlobalAttributes() {
    return [
      {
        types: [
          "paragraph",
          "heading",
          "blockquote",
          "bulletList",
          "orderedList",
          "codeBlock",
          "horizontalRule",
          "table",
          "rawMarkdown",
        ],
        attributes: Object.fromEntries(
          ["mdSource", "mdBaseline", "mdGap", "mdTail", "mdTableAlign"].map(
            (k) => [k, { default: null, rendered: false }],
          ),
        ),
      },
    ];
  },
});
const snippets = [
  ["標題", "## 新章節\n\n"],
  ["清單", "- 第一項\n- 第二項\n"],
  ["表格", "| 欄位 | 說明 |\n| --- | --- |\n| 項目 | 內容 |\n"],
  ["程式碼", "```typescript\n// 在這裡輸入程式碼\n```"],
  ["流程圖", "```mermaid\nflowchart TD\n  A[開始] --> B[下一步]\n```"],
  [
    "統計圖",
    '```chart\n{ "type": "bar", "title": "請填入真實資料", "labels": [], "series": [{"name":"資料","values":[]}] }\n```',
  ],
  ["圖片", "![圖片說明](圖片網址)"],
];
export function DocumentComposer({
  value,
  onChange,
  disabled = false,
  onComposingChange,
  domain = "articles",
  slug = "",
  draftId = "",
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onComposingChange?: (active: boolean) => void;
  domain?: "articles" | "research" | "leetcode";
  slug?: string;
  draftId?: string;
}) {
  const latest = useRef(value);
  const [initialDocument] = useState(() => parseDocumentMarkdown(value));
  const callback = useRef(onChange);
  const [source, setSource] = useState(false);
  const [menu, setMenu] = useState(false);
  const [filter, setFilter] = useState("");
  const [drag, setDrag] = useState(false);
  const [find, setFind] = useState(false);
  const plainPaste = useRef(false);
  const initializedEditor = useRef(false);
  const sourceCursor = useRef(0);
  const [caret, setCaret] = useState(0);
  const embedContext = useMemo(
    () => ({
      url:
        domain === "articles"
          ? "/api/admin/preview"
          : `/api/admin/${domain}-preview`,
      slug,
      draftId,
      disabled,
    }),
    [domain, slug, draftId, disabled],
  );
  useEffect(() => {
    callback.current = onChange;
  }, [onChange]);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false },
        trailingNode: false,
      }),
      TableKit,
      Placeholder.configure({
        placeholder: "開始寫作，輸入 / 插入內容；也可以直接貼上 Markdown…",
      }),
      RawMarkdown,
      SourceTrivia,
    ],
    content: initialDocument,
    editable: !disabled,
    editorProps: {
      attributes: { class: "document-prose", "aria-label": "文件正文" },
      handlePaste: (view, event) => {
        if (plainPaste.current) {
          plainPaste.current = false;
          const text = event.clipboardData?.getData("text/plain");
          if (text != null) {
            view.dispatch(view.state.tr.insertText(text));
            return true;
          }
        }
        if (view.state.selection.$from.parent.type.name === "codeBlock")
          return false;
        const text = event.clipboardData?.getData("text/plain");
        if (
          !text ||
          !/(^|\n)(#{1,6} |[-*] |\d+\. |```|\|)|\!\[|\*\*|\n\n/.test(text)
        )
          return false;
        editor
          ?.chain()
          .focus()
          .insertContent(parseDocumentMarkdown(text).content ?? [])
          .run();
        return true;
      },
      handleKeyDown: (_view, event) => {
        if (event.isComposing) return false;
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "k"
        ) {
          event.preventDefault();
          const href = window.prompt("連結網址（留空取消連結）");
          if (href !== null) {
            if (href) editor?.chain().focus().setLink({ href }).run();
            else editor?.chain().focus().unsetLink().run();
          }
          return true;
        }
        plainPaste.current =
          (event.ctrlKey || event.metaKey) &&
          event.shiftKey &&
          event.key.toLowerCase() === "v";
        if (
          (event.ctrlKey || event.metaKey) &&
          (event.key.toLowerCase() === "f" ||
            (!event.metaKey && event.key.toLowerCase() === "h") ||
            (event.altKey && event.key.toLowerCase() === "f"))
        ) {
          event.preventDefault();
          setFind(true);
          setSource(true);
          return true;
        }
        if (
          event.key === "/" &&
          !event.ctrlKey &&
          !event.metaKey &&
          editor?.state.selection.$from.parent.textContent === ""
        ) {
          setMenu(true);
          setFilter("");
          event.preventDefault();
          return true;
        }
        if (event.key === "Escape") {
          setMenu(false);
          return false;
        }
        if (
          (event.ctrlKey || event.metaKey) &&
          event.shiftKey &&
          event.key.toLowerCase() === "p"
        ) {
          event.preventDefault();
          setMenu((m) => !m);
          return true;
        }
        return false;
      },
    },
    onCreate: ({ editor: e }) => {
      e.commands.setContent(withDocumentBaselines(e.getJSON()), {
        emitUpdate: false,
      });
      initializedEditor.current = true;
    },
    onUpdate: ({ editor: e }) => {
      if (!initializedEditor.current) return;
      const next = serializeDocumentMarkdown(e.getJSON());
      if (next === latest.current) return;
      latest.current = next;
      callback.current(next);
    },
  });
  const editingTable = useEditorState({
    editor,
    selector: ({ editor: e }) => e?.isActive("table") ?? false,
  });
  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);
  useEffect(() => {
    if (editor && value !== latest.current) {
      latest.current = value;
      editor.commands.setContent(parseDocumentMarkdown(value), {
        emitUpdate: false,
      });
      editor.commands.setContent(withDocumentBaselines(editor.getJSON()), {
        emitUpdate: false,
      });
    }
  }, [value, editor]);
  function insert(snippet: string) {
    if (source && editor) {
      const position = sourceCursor.current;
      const next =
        value.slice(0, position) +
        "\n\n" +
        snippet +
        "\n\n" +
        value.slice(position);
      latest.current = next;
      callback.current(next);
      editor.commands.setContent(parseDocumentMarkdown(next), {
        emitUpdate: false,
      });
      editor.commands.setContent(withDocumentBaselines(editor.getJSON()), {
        emitUpdate: false,
      });
      setCaret(position + snippet.length + 4);
      setMenu(false);
      return;
    }
    editor
      ?.chain()
      .focus()
      .insertContent(parseDocumentMarkdown(snippet).content ?? [])
      .run();
    setMenu(false);
  }
  function switchMode() {
    setFind(false);
    if (!editor) return;
    if (!source) {
      const doc = editor.getJSON();
      const index = editor.state.selection.$from.index(0);
      const prefix = serializeDocumentMarkdown({
        ...doc,
        content: doc.content?.slice(0, index),
      });
      setCaret(prefix.length + editor.state.selection.$from.parentOffset);
      setSource(true);
    } else {
      let rawOffset = 0;
      let target = 1;
      let found = false;
      const doc = editor.getJSON();
      editor.state.doc.forEach((node, offset, index) => {
        const n = doc.content?.[index];
        if (!n || found) return;
        const size = serializeDocumentMarkdown({
          type: "doc",
          content: [n],
        }).length;
        if (sourceCursor.current <= rawOffset + size) {
          target =
            offset +
            (node.isAtom
              ? 0
              : 1 +
                Math.min(
                  node.content.size,
                  Math.max(0, sourceCursor.current - rawOffset),
                ));
          found = true;
        }
        rawOffset += size;
      });
      setSource(false);
      editor.chain().setTextSelection(target).focus().run();
    }
  }
  return (
    <EmbedContext.Provider value={embedContext}>
      <fieldset
        disabled={disabled}
        onKeyDown={(event) => {
          if (event.defaultPrevented || event.nativeEvent.isComposing) return;
          if (
            (event.ctrlKey || event.metaKey) &&
            event.shiftKey &&
            event.key.toLowerCase() === "p"
          ) {
            event.preventDefault();
            setMenu((m) => !m);
          }
        }}
        className="document-composer"
        onCompositionStart={() => onComposingChange?.(true)}
        onCompositionEnd={() => onComposingChange?.(false)}
      >
        <div className="composer-toolbar">
          <button type="button" onClick={switchMode}>
            {source ? "文件" : "Markdown"}
          </button>
          <button type="button" onClick={() => setMenu(!menu)}>
            ＋ 插入
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => editor?.chain().focus().undo().run()}
          >
            復原
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => editor?.chain().focus().redo().run()}
          >
            重做
          </button>
          {!source && (
            <>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleBold().run()}
              >
                粗體
              </button>
              <button
                type="button"
                onClick={() => {
                  const href = window.prompt("連結網址（留空取消連結）");
                  if (href !== null) {
                    if (href) editor?.chain().focus().setLink({ href }).run();
                    else editor?.chain().focus().unsetLink().run();
                  }
                }}
              >
                連結
              </button>
              {editingTable && (
                <>
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().addRowAfter().run()}
                  >
                    加列
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      editor?.chain().focus().addColumnAfter().run()
                    }
                  >
                    加欄
                  </button>
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().deleteTable().run()}
                  >
                    刪除表格
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setDrag(!drag)}
                aria-pressed={drag}
              >
                排序工具
              </button>
            </>
          )}
        </div>
        {menu && (
          <div
            className="composer-menu"
            role="dialog"
            aria-label="插入與命令"
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === "Escape") {
                setMenu(false);
                editor?.commands.focus();
              }
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                const items = [
                  ...e.currentTarget.querySelectorAll<HTMLButtonElement>(
                    "button",
                  ),
                ];
                const index = items.indexOf(e.target as HTMLButtonElement);
                items[
                  index < 0
                    ? e.key === "ArrowDown"
                      ? 0
                      : items.length - 1
                    : (index +
                        (e.key === "ArrowDown" ? 1 : -1) +
                        items.length) %
                      items.length
                ]?.focus();
              }
            }}
          >
            <input
              aria-label="搜尋插入項目"
              autoFocus
              placeholder="搜尋標題、表格、流程圖…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === "Escape") setMenu(false);
                if (e.key === "Enter") {
                  const match = snippets.find(([label]) =>
                    label.includes(filter),
                  );
                  if (match) insert(match[1]);
                }
              }}
            />
            {snippets
              .filter(([label]) => label.includes(filter))
              .map(([label, snippet]) => (
                <button
                  type="button"
                  key={label}
                  onClick={() => insert(snippet)}
                >
                  {label}
                </button>
              ))}
            <small>
              Ctrl/⌘+B 粗體 · Ctrl/⌘+I 斜體 · Ctrl/⌘+K 連結 · Ctrl/⌘+Z 復原 ·
              Markdown 模式可搜尋取代
            </small>
          </div>
        )}
        {source ? (
          <SourceEditor
            searchOpen={find}
            initialPosition={caret}
            onSelectionChange={(position) => {
              sourceCursor.current = position;
            }}
            value={value}
            onChange={(v) => {
              latest.current = v;
              callback.current(v);
              editor?.commands.setContent(parseDocumentMarkdown(v), {
                emitUpdate: false,
              });
              if (editor)
                editor.commands.setContent(
                  withDocumentBaselines(editor.getJSON()),
                  { emitUpdate: false },
                );
            }}
            disabled={disabled}
          />
        ) : (
          <>
            <EditorContent editor={editor} />
            {drag && editor && (
              <div className="composer-order" aria-label="區塊排序">
                {editor.getJSON().content?.map((n, i) => (
                  <div
                    draggable
                    key={i}
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/plain", String(i))
                    }
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = Number(e.dataTransfer.getData("text/plain"));
                      const doc = editor.getJSON();
                      if (!Number.isInteger(from) || !doc.content?.[from])
                        return;
                      const [item] = doc.content.splice(from, 1);
                      doc.content.splice(i, 0, item);
                      editor.commands.setContent(doc);
                    }}
                  >
                    <span>
                      ⠿{" "}
                      {n.content
                        ?.map((c) => ("text" in c ? (c.text ?? "") : ""))
                        .join("")
                        .slice(0, 45) || n.type}
                    </span>
                    <button
                      type="button"
                      aria-label={`上移區塊 ${i + 1}`}
                      disabled={i === 0 || disabled}
                      onClick={() => {
                        const doc = editor.getJSON();
                        if (!doc.content || i === 0) return;
                        [doc.content[i - 1], doc.content[i]] = [
                          doc.content[i],
                          doc.content[i - 1],
                        ];
                        editor.commands.setContent(doc);
                      }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`下移區塊 ${i + 1}`}
                      disabled={
                        i === (editor.getJSON().content?.length ?? 0) - 1 ||
                        disabled
                      }
                      onClick={() => {
                        const doc = editor.getJSON();
                        if (!doc.content || i === doc.content.length - 1)
                          return;
                        [doc.content[i + 1], doc.content[i]] = [
                          doc.content[i],
                          doc.content[i + 1],
                        ];
                        editor.commands.setContent(doc);
                      }}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const doc = editor.getJSON();
                        doc.content?.splice(i, 1);
                        editor.commands.setContent(doc);
                      }}
                    >
                      刪除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </fieldset>
    </EmbedContext.Provider>
  );
}
