import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildPreviewHtml,
  defaultMarkdown,
  guessTitleFromMarkdown,
  normalizeMermaidDefinition,
} from "./lib/markdown.js";
import mermaidBundle from "mermaid/dist/mermaid.min.js?raw";

const initialTitle = guessTitleFromMarkdown(defaultMarkdown);
const copyrightText = "Alan Zou worked with Codex GPT";
const EDITOR_LINE_HEIGHT_RATIO = 1.7;

function decodeHtmlEntities(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getEditorLineHeight(fontSize) {
  return fontSize * EDITOR_LINE_HEIGHT_RATIO;
}

let mermaidRuntimePromise;

function loadMermaidRuntime() {
  if (window.mermaid) {
    return Promise.resolve(window.mermaid);
  }

  if (!mermaidRuntimePromise) {
    mermaidRuntimePromise = Promise.resolve().then(() => {
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.text = mermaidBundle;
      document.head.appendChild(script);
      if (!window.mermaid) {
        throw new Error("Mermaid runtime unavailable");
      }
      return window.mermaid;
    });
  }

  return mermaidRuntimePromise;
}

export default function App() {
  const apiReady = Boolean(window.desktopAPI);
  const previewRef = useRef(null);
  const editorRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const workspaceRef = useRef(null);
  const [markdown, setMarkdown] = useState(defaultMarkdown);
  const [title, setTitle] = useState(initialTitle);
  const [filePath, setFilePath] = useState("");
  const [status, setStatus] = useState("\u5c31\u7eea");
  const [isBusy, setIsBusy] = useState(false);
  const [editorWidth, setEditorWidth] = useState(45);
  const [editorFontSize, setEditorFontSize] = useState(16);
  const [previewFontSize, setPreviewFontSize] = useState(15);
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);

  const editorLineHeight = getEditorLineHeight(editorFontSize);
  const lineNumbers = useMemo(
    () => Array.from({ length: Math.max(1, markdown.split("\n").length) }, (_unused, index) => index + 1),
    [markdown],
  );

  function setOpenedMarkdown(result, nextStatus) {
    if (!result || result.canceled) {
      return;
    }
    setMarkdown(result.content);
    setFilePath(result.filePath);
    setTitle(result.title || guessTitleFromMarkdown(result.content));
    if (nextStatus) {
      setStatus(nextStatus);
    }
  }

  function syncLineNumberScroll() {
    const editor = editorRef.current;
    const gutter = lineNumbersRef.current;
    if (!editor || !gutter) {
      return;
    }
    gutter.scrollTop = editor.scrollTop;
  }

  useEffect(() => {
    const nextTitle = guessTitleFromMarkdown(markdown);
    if (nextTitle) {
      setTitle(nextTitle);
    }
  }, [markdown]);

  useEffect(() => {
    const fixture = new URLSearchParams(window.location.search).get("fixture");
    if (!fixture) {
      return;
    }

    let active = true;
    fetch(`./${fixture}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`fixture load failed: ${response.status}`);
        }
        return response.text();
      })
      .then((content) => {
        if (!active) {
          return;
        }
        setMarkdown(content);
        setTitle(guessTitleFromMarkdown(content));
        setStatus(`\u5df2\u52a0\u8f7d\u6d4b\u8bd5\u6587\u6863 ${fixture}`);
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setStatus(`\u6d4b\u8bd5\u6587\u6863\u52a0\u8f7d\u5931\u8d25\uff1a${error.message}`);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    syncLineNumberScroll();
  }, [markdown, editorFontSize]);

  useEffect(() => {
    window.desktopAPI?.debugLog?.("app:mount", { apiReady });
    window.desktopAPI?.getLogPath?.().then((path) => {
      window.desktopAPI?.debugLog?.("app:log-path", { path });
    }).catch(() => {});
  }, [apiReady]);

  useEffect(() => {
    if (!apiReady) {
      return undefined;
    }

    let active = true;

    window.desktopAPI.getLaunchMarkdown?.().then((result) => {
      if (!active || !result) {
        return;
      }
      window.desktopAPI.debugLog?.("app:launch-markdown", { filePath: result.filePath });
      setOpenedMarkdown(result, `\u5df2\u6253\u5f00 ${result.filePath}`);
    }).catch(() => {});

    const unsubscribe = window.desktopAPI.onOpenMarkdown?.((result) => {
      window.desktopAPI.debugLog?.("app:open-markdown:event", { filePath: result?.filePath });
      setOpenedMarkdown(result, `\u5df2\u6253\u5f00 ${result.filePath}`);
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [apiReady]);

  useEffect(() => {
    if (!window.desktopAPI?.onMenuAction) {
      return undefined;
    }

    const unsubscribe = window.desktopAPI.onMenuAction(async (action) => {
      window.desktopAPI.debugLog?.("menu:received", { action });
      if (action === "open-markdown") await handleOpen();
      if (action === "save-markdown") await handleSave();
      if (action === "export-pdf") await handleExportPdf();
      if (action === "open-log") await handleOpenLog();
    });

    return unsubscribe;
  }, [markdown, filePath, title]);

  let previewHtml = "";
  let previewError = "";
  try {
    previewHtml = buildPreviewHtml(markdown);
  } catch (error) {
    previewError = error.message;
  }

  useEffect(() => {
    if (!previewRef.current || previewError) {
      return;
    }
    previewRef.current.innerHTML = previewHtml;
  }, [previewHtml, previewError]);

  useEffect(() => {
    if (!isDraggingDivider) {
      return undefined;
    }

    const handlePointerMove = (event) => {
      const workspace = workspaceRef.current;
      if (!workspace) {
        return;
      }
      const bounds = workspace.getBoundingClientRect();
      if (bounds.width <= 0) {
        return;
      }
      const nextPercent = ((event.clientX - bounds.left) / bounds.width) * 100;
      setEditorWidth(clamp(nextPercent, 25, 75));
    };

    const handlePointerUp = () => {
      setIsDraggingDivider(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDraggingDivider]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return undefined;
    }

    const handleEditorScroll = () => {
      syncLineNumberScroll();
    };

    editor.addEventListener("scroll", handleEditorScroll);

    return () => {
      editor.removeEventListener("scroll", handleEditorScroll);
    };
  }, []);

  useEffect(() => {
    if (!previewRef.current || previewError) {
      return undefined;
    }

    let cancelled = false;

    async function renderMermaidBlocks() {
      const blocks = Array.from(previewRef.current.querySelectorAll("[data-mermaid-block]"));
      window.desktopAPI?.debugLog?.("preview:mermaid:blocks", { count: blocks.length });
      if (blocks.length === 0) {
        return;
      }

      const mermaid = await loadMermaidRuntime();
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "loose",
        theme: "neutral",
      });

      for (let index = 0; index < blocks.length; index += 1) {
        if (cancelled) {
          return;
        }

        const block = blocks[index];
        const node = block.querySelector(".mermaid-diagram");
        const source = block.querySelector(".mermaid-source");
        const rawDefinition = decodeHtmlEntities(block.querySelector(".mermaid-definition")?.textContent || "");
        const definition = normalizeMermaidDefinition(rawDefinition);
        window.desktopAPI?.debugLog?.("preview:mermaid:block", { index, definition });
        if (!definition.trim()) {
          continue;
        }

        try {
          const result = await mermaid.render(`preview-mermaid-${Date.now()}-${index}`, definition);
          if (cancelled) {
            return;
          }
          node.innerHTML = result.svg;
          window.desktopAPI?.debugLog?.("preview:mermaid:rendered", {
            index,
            svgLength: result.svg.length,
          });
          source?.classList.remove("is-visible");
          if (typeof result.bindFunctions === "function") {
            result.bindFunctions(node);
          }
        } catch (error) {
          window.desktopAPI?.debugLog?.("preview:mermaid:block-error", {
            error: error.message,
            definition,
          });
          node.innerHTML = `<div class="mermaid-error">${error.message}</div>`;
          source?.classList.add("is-visible");
        }
      }
    }

    renderMermaidBlocks().catch((error) => {
      window.desktopAPI?.debugLog?.("preview:mermaid:error", { error: error.message });
    });

    return () => {
      cancelled = true;
    };
  }, [previewHtml, previewError]);

  useEffect(() => {
    if (!previewRef.current || previewError) {
      return undefined;
    }

    const container = previewRef.current;
    const handleClick = (event) => {
      const anchor = event.target.closest('a[href^="#ref-"]');
      if (!anchor) {
        return;
      }

      const targetId = anchor.getAttribute("href")?.slice(1);
      if (!targetId) {
        return;
      }

      const target = container.querySelector(`#${CSS.escape(targetId)}`);
      if (!target) {
        return;
      }

      event.preventDefault();
      target.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    };

    container.addEventListener("click", handleClick);
    return () => {
      container.removeEventListener("click", handleClick);
    };
  }, [previewHtml, previewError]);

  async function runTask(task, pendingMessage, successMessage) {
    if (!apiReady) {
      setStatus("\u5931\u8d25\uff1a\u684c\u9762\u6865\u63a5\u672a\u52a0\u8f7d\uff0c\u8bf7\u91cd\u65b0\u5b89\u88c5\u6216\u91cd\u542f\u5e94\u7528");
      return;
    }

    window.desktopAPI.debugLog?.("task:start", { pendingMessage });
    setIsBusy(true);
    setStatus(pendingMessage);
    try {
      const result = await task();
      if (result?.canceled) {
        setStatus("\u5df2\u53d6\u6d88");
        window.desktopAPI.debugLog?.("task:canceled", { pendingMessage });
        return;
      }
      setStatus(successMessage(result));
      window.desktopAPI.debugLog?.("task:done", { pendingMessage, result });
    } catch (error) {
      setStatus(`\u5931\u8d25\uff1a${error.message}`);
      window.desktopAPI.debugLog?.("task:error", { pendingMessage, error: error.message });
    } finally {
      setIsBusy(false);
    }
  }

  function handleOpen() {
    return runTask(
      async () => {
        const result = await window.desktopAPI.openMarkdownFile();
        if (!result.canceled) {
          window.desktopAPI.debugLog?.("open:result", {
            filePath: result.filePath,
            chars: result.content?.length || 0,
          });
          setOpenedMarkdown(result);
        }
        return result;
      },
      "\u6b63\u5728\u6253\u5f00 Markdown \u6587\u4ef6...",
      (result) => `\u5df2\u6253\u5f00 ${result.filePath}`,
    );
  }

  function handleSave() {
    return runTask(
      async () => {
        const result = await window.desktopAPI.saveMarkdownFile({ filePath, content: markdown, title });
        if (!result.canceled) {
          setFilePath(result.filePath);
        }
        return result;
      },
      "\u6b63\u5728\u4fdd\u5b58 Markdown \u6587\u4ef6...",
      (result) => `\u5df2\u4fdd\u5b58\u5230 ${result.filePath}`,
    );
  }

  function handleExportPdf() {
    return runTask(
      () => window.desktopAPI.exportPdf({ markdown, title }),
      "\u6b63\u5728\u5bfc\u51fa PDF...",
      (result) => `PDF \u5df2\u5bfc\u51fa\u5230 ${result.filePath}`,
    );
  }

  function handleOpenLog() {
    return runTask(
      () => window.desktopAPI.openLogFile(),
      "\u6b63\u5728\u6253\u5f00\u65e5\u5fd7...",
      (result) => `\u65e5\u5fd7\u5df2\u6253\u5f00 ${result.filePath}`,
    );
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Local Windows Markdown Reader</p>
          <h1>{title || "\u672a\u547d\u540d\u6587\u6863"}</h1>
          <p className="meta">{filePath || "\u5f53\u524d\u662f\u5185\u7f6e\u793a\u4f8b\u6587\u6863"}</p>
        </div>
        <div className="actions">
          <button onClick={handleOpen} disabled={isBusy || !apiReady}>{"\u6253\u5f00 Markdown \u6587\u4ef6"}</button>
          <button onClick={handleSave} disabled={isBusy || !apiReady}>{"\u4fdd\u5b58 Markdown"}</button>
          <button onClick={handleExportPdf} disabled={isBusy || !apiReady}>{"\u5bfc\u51fa PDF"}</button>
          <button onClick={handleOpenLog} disabled={isBusy || !apiReady}>{"\u67e5\u770b\u65e5\u5fd7"}</button>
        </div>
      </header>

      <section className="controls-bar">
        <label className="control">
          <span>{"\u5206\u680f\u6bd4\u4f8b"}</span>
          <input
            type="range"
            min="30"
            max="70"
            value={editorWidth}
            onChange={(event) => setEditorWidth(Number(event.target.value))}
          />
          <strong>{Math.round(editorWidth)}% / {Math.round(100 - editorWidth)}%</strong>
        </label>

        <label className="control">
          <span>{"\u7f16\u8f91\u5b57\u4f53"}</span>
          <input
            type="range"
            min="12"
            max="24"
            value={editorFontSize}
            onChange={(event) => setEditorFontSize(Number(event.target.value))}
          />
          <strong>{editorFontSize}px</strong>
        </label>

        <label className="control">
          <span>{"\u9884\u89c8\u5b57\u4f53"}</span>
          <input
            type="range"
            min="12"
            max="24"
            value={previewFontSize}
            onChange={(event) => setPreviewFontSize(Number(event.target.value))}
          />
          <strong>{previewFontSize}px</strong>
        </label>

        <div className="control control-status">
          <span>{"\u5b9a\u4f4d\u6a21\u5f0f"}</span>
          <strong>{"\u5df2\u5173\u95ed\u540c\u6b65\u5b9a\u4f4d"}</strong>
        </div>
      </section>

      <main ref={workspaceRef} className="workspace">
        <section className="panel editor-panel" style={{ width: `${editorWidth}%` }}>
          <div className="panel-header">
            <span>Markdown</span>
            <span>{lineNumbers.length} lines</span>
          </div>
          <div className="editor-shell">
            <div ref={lineNumbersRef} className="line-numbers" aria-hidden="true">
              <div className="line-numbers-inner" style={{ lineHeight: `${editorLineHeight}px`, fontSize: `${Math.max(11, editorFontSize - 2)}px` }}>
                {lineNumbers.map((lineNumber) => (
                  <span key={lineNumber} className="line-number">{lineNumber}</span>
                ))}
              </div>
            </div>
            <textarea
              ref={editorRef}
              className="editor"
              value={markdown}
              onChange={(event) => setMarkdown(event.target.value)}
              spellCheck={false}
              style={{ fontSize: `${editorFontSize}px`, lineHeight: EDITOR_LINE_HEIGHT_RATIO }}
            />
          </div>
        </section>

        <div
          className={`splitter${isDraggingDivider ? " is-dragging" : ""}`}
          onPointerDown={() => setIsDraggingDivider(true)}
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={editorWidth}
        />

        <section className="panel preview-panel" style={{ width: `${100 - editorWidth}%` }}>
          <div className="panel-header">
            <span>{"\u9884\u89c8"}</span>
            <span>KaTeX + Mermaid + Tables + Code</span>
          </div>
          {previewError ? (
            <div className="preview markdown-body">
              <h2>{"\u9884\u89c8\u5931\u8d25"}</h2>
              <p>{previewError}</p>
            </div>
          ) : (
            <div
              ref={previewRef}
              className="preview markdown-body"
              style={{ "--preview-font-size": `${previewFontSize}px` }}
            />
          )}
        </section>
      </main>

      <footer className="statusbar">
        <span>{status}</span>
        <span> | {copyrightText}</span>
        {!apiReady ? <span>{" | \u684c\u9762\u6865\u63a5\u672a\u5c31\u7eea"}</span> : null}
      </footer>
    </div>
  );
}
