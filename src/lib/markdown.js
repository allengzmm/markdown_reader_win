import MarkdownIt from "markdown-it";
import katex from "katex";

const RESEARCH_CITE_PATTERN = /\uE200cite\uE202(.*?)\uE201/g;
const RESEARCH_ENTITY_PATTERN = /\uE200entity\uE202(.*?)\uE201/g;
const SOURCE_LINE_TOKEN_TYPES = new Set([
  "paragraph_open",
  "heading_open",
  "blockquote_open",
  "ordered_list_open",
  "bullet_list_open",
  "list_item_open",
  "table_open",
  "thead_open",
  "tbody_open",
  "tr_open",
  "th_open",
  "td_open",
  "fence",
  "code_block",
  "hr",
]);

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
});

function withSourceLine(originalRule) {
  return (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    if (token?.map && SOURCE_LINE_TOKEN_TYPES.has(token.type)) {
      token.attrSet("data-source-line", String(token.map[0] + 1));
    }
    return originalRule ? originalRule(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options);
  };
}

for (const tokenType of SOURCE_LINE_TOKEN_TYPES) {
  md.renderer.rules[tokenType] = withSourceLine(md.renderer.rules[tokenType]);
}

function createProtectedMarkdown(markdown) {
  const sanitizedMarkdown = stripResearchMarkers(markdown);
  const replacements = [];
  let tokenIndex = 0;

  const createToken = (html, prefix = "") => {
    const token = `@@MDR_PLACEHOLDER_${String(tokenIndex++).padStart(6, "0")}@@`;
    replacements.push([token, html]);
    return `${prefix}${token}`;
  };

  const stripQuotePrefix = (line, prefix) => (prefix ? line.replace(new RegExp(`^${escapeRegExp(prefix)}`), "") : line);
  const lines = sanitizedMarkdown.replace(/\r\n/g, "\n").split("\n");
  const protectedLines = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const blockMatch = line.match(/^(\s*> ?)?(\\\[|\$\$|\\begin\{([a-zA-Z*]+)\})\s*$/);
    if (!blockMatch) {
      protectedLines.push(line);
      continue;
    }

    const prefix = blockMatch[1] || "";
    const opener = blockMatch[2];
    const envName = blockMatch[3] || null;
    const closingPattern = opener === "\\["
      ? new RegExp(`^${escapeRegExp(prefix)}\\\\\\]\\s*$`)
      : opener === "$$"
        ? new RegExp(`^${escapeRegExp(prefix)}\\$\\$\\s*$`)
        : new RegExp(`^${escapeRegExp(prefix)}\\\\end\\{${escapeRegExp(envName)}\\}\\s*$`);

    const body = [];
    let endIndex = i + 1;
    for (; endIndex < lines.length; endIndex += 1) {
      if (closingPattern.test(lines[endIndex])) {
        break;
      }
      body.push(stripQuotePrefix(lines[endIndex], prefix));
    }

    if (endIndex >= lines.length) {
      protectedLines.push(line);
      continue;
    }

    const expression = opener.startsWith("\\begin")
      ? [opener, ...body, `\\end{${envName}}`].join("\n")
      : body.join("\n");

    protectedLines.push(createToken(renderMath(expression, true), prefix));
    i = endIndex;
  }

  const protectedMarkdown = protectInlineMath(protectedLines.join("\n"), createToken);
  return { protectedMarkdown, replacements };
}

function protectInlineMath(markdown, createToken) {
  let result = "";

  for (let index = 0; index < markdown.length; index += 1) {
    if (markdown.startsWith("\\(", index)) {
      const closingIndex = findClosingBracket(markdown, index + 2, "\\)");
      if (closingIndex !== -1) {
        const expression = markdown.slice(index + 2, closingIndex);
        result += createToken(renderMath(expression, false));
        index = closingIndex + 1;
        continue;
      }
    }

    if (markdown[index] === "$" && markdown[index - 1] !== "\\" && markdown[index + 1] !== "$") {
      const closingIndex = findClosingDollar(markdown, index + 1);
      if (closingIndex !== -1) {
        const expression = markdown.slice(index + 1, closingIndex);
        if (isLikelyInlineMath(expression)) {
          result += createToken(renderMath(expression, false));
          index = closingIndex;
          continue;
        }
      }
    }

    result += markdown[index];
  }

  return result;
}

function findClosingBracket(markdown, startIndex, closer) {
  for (let index = startIndex; index < markdown.length; index += 1) {
    if (markdown[index] === "\n" || markdown[index] === "\r") {
      return -1;
    }
    if (markdown.startsWith(closer, index) && markdown[index - 1] !== "\\") {
      return index;
    }
  }
  return -1;
}

function findClosingDollar(markdown, startIndex) {
  for (let index = startIndex; index < markdown.length; index += 1) {
    if (markdown[index] === "\n" || markdown[index] === "\r") {
      return -1;
    }
    if (markdown[index] === "$" && markdown[index - 1] !== "\\" && markdown[index + 1] !== "$") {
      return index;
    }
  }
  return -1;
}

function isLikelyInlineMath(expression) {
  const trimmed = expression.trim();
  if (!trimmed) {
    return false;
  }
  return !/^\d+(?:[.,]\d+)?%?$/.test(trimmed);
}

function renderMath(expression, displayMode) {
  try {
    return katex.renderToString(expression.trim(), {
      displayMode,
      output: "html",
      throwOnError: false,
      strict: "ignore",
    });
  } catch {
    return displayMode ? `<pre>${escapeHtml(expression)}</pre>` : escapeHtml(expression);
  }
}

export const defaultMarkdown = `# \u6570\u5b66 Markdown \u9605\u8bfb\u5668

\u8fd9\u662f\u4e00\u4e2a\u672c\u5730 Windows \u7248 Markdown \u9605\u8bfb\u5668\u793a\u4f8b\uff0c\u652f\u6301\uff1a

- \u884c\u5185\u516c\u5f0f\uff1a\\(E = mc^2\\)
- \u5757\u7ea7\u516c\u5f0f\uff1a

$$
\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}
$$

- \u8868\u683c\u3001\u4ee3\u7801\u5757\u3001\u5f15\u7528\u3001\u5217\u8868
- Mermaid \u56fe\u6e32\u67d3

## \u8868\u683c

| \u529f\u80fd | \u72b6\u6001 |
| --- | --- |
| Markdown \u9884\u89c8 | \u5df2\u652f\u6301 |
| \u6570\u5b66\u516c\u5f0f\u6e32\u67d3 | \u5df2\u652f\u6301 |
| \u5bfc\u51fa PDF | \u5df2\u652f\u6301 |
| \u5bfc\u51fa Word | \u5df2\u652f\u6301 |

## \u4ee3\u7801

\`\`\`ts
type Formula = {
  inline: string;
  block: string;
};
\`\`\`

## \u8bf4\u660e

\u4f60\u53ef\u4ee5\u70b9\u51fb\u53f3\u4e0a\u89d2\u6309\u94ae\u6253\u5f00\u672c\u5730 \`.md\` \u6587\u4ef6\uff0c\u4e5f\u53ef\u4ee5\u5728\u201c\u6587\u4ef6\u201d\u83dc\u5355\u4e2d\u6253\u5f00\u3002\u5bfc\u51fa Word \u65f6\u4f1a\u4fdd\u7559\u5f53\u524d\u6392\u7248\u548c\u516c\u5f0f\u6e32\u67d3\u7ed3\u679c\u3002`;

export function guessTitleFromMarkdown(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "\u672a\u547d\u540d\u6587\u6863";
}

export function renderMarkdownToHtml(markdown) {
  const { protectedMarkdown, replacements } = createProtectedMarkdown(markdown);
  let html = md.render(protectedMarkdown);
  for (const [token, replacement] of replacements) {
    html = html.split(token).join(replacement);
  }
  return decorateMermaidBlocks(html);
}

export function buildPreviewHtml(markdown) {
  return renderMarkdownToHtml(markdown);
}

export function normalizeMermaidDefinition(definition) {
  const normalized = definition.replace(/\r\n/g, "\n");
  const trimmed = normalized.trimStart();
  if (!/^(graph|flowchart)\b/i.test(trimmed)) {
    return normalized;
  }

  return normalized.split("\n").map((line) => normalizeMermaidLine(line)).join("\n");
}

export function buildExportHtml({ title, body, katexCss = "", mermaidScript = "", includeMermaidRuntime = false }) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    ${katexCss}
    :root {
      --paper: #fffdfa;
      --line: #ddd6c8;
      --ink: #1f2937;
      --muted: #4b5563;
      --accent: #9a3412;
      --code-bg: #f4efe7;
      --quote-bg: #fdf1ea;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      background: var(--paper);
      font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    }
    main {
      width: min(960px, calc(100vw - 36px));
      margin: 0 auto;
      padding: 24px 0 40px;
    }
    h1, h2, h3, h4 {
      color: var(--ink);
      line-height: 1.3;
      page-break-after: avoid;
    }
    h1 {
      font-size: 30px;
      margin: 0 0 18px;
      border-bottom: 2px solid rgba(154, 52, 18, 0.15);
      padding-bottom: 12px;
    }
    h2 {
      font-size: 22px;
      margin: 28px 0 12px;
      padding-left: 12px;
      border-left: 4px solid var(--accent);
    }
    h3 {
      font-size: 18px;
      margin: 22px 0 10px;
    }
    p, li, td, th, blockquote {
      font-size: 14px;
      line-height: 1.75;
      color: var(--muted);
    }
    p, ul, ol, pre, table, blockquote {
      margin: 0 0 14px;
    }
    ul, ol {
      padding-left: 24px;
    }
    code {
      font-family: "Cascadia Code", Consolas, monospace;
      background: var(--code-bg);
      border-radius: 4px;
      padding: 2px 6px;
      color: var(--ink);
    }
    pre {
      background: #1f2937;
      color: #f8fafc;
      border-radius: 12px;
      padding: 16px;
      overflow: auto;
    }
    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border: 1px solid var(--line);
      padding: 8px 10px;
      vertical-align: top;
      word-break: break-word;
    }
    th {
      background: rgba(154, 52, 18, 0.08);
      text-align: left;
      color: var(--ink);
    }
    blockquote {
      border-left: 4px solid rgba(154, 52, 18, 0.3);
      background: var(--quote-bg);
      padding: 10px 14px;
      margin-left: 0;
    }
    .katex-display {
      overflow-x: auto;
      overflow-y: hidden;
      padding: 6px 0;
    }
    .citation-ref {
      margin-left: 0.18em;
      font-size: 0.78em;
      vertical-align: super;
      line-height: 0;
    }
    .citation-ref a {
      color: var(--accent);
      text-decoration: none;
    }
    .citation-target {
      display: inline-block;
      width: 0;
      height: 0;
      overflow: hidden;
    }
    .mermaid-block {
      margin: 0 0 18px;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.72);
      overflow: hidden;
    }
    .mermaid-diagram {
      padding: 18px;
      overflow-x: auto;
    }
    .mermaid-diagram svg {
      display: block;
      max-width: 100%;
      height: auto;
      margin: 0 auto;
    }
    .mermaid-source {
      display: none;
      margin: 0;
      border-radius: 0;
    }
    .mermaid-source.is-visible {
      display: block;
    }
    .mermaid-error {
      padding: 12px 14px 0;
      color: #b91c1c;
      font-size: 13px;
    }
    @page {
      size: A4;
      margin: 14mm 14mm 16mm;
    }
  </style>
</head>
<body>
  <main class="markdown-body">
    ${body}
  </main>
  ${includeMermaidRuntime ? `<script>${mermaidScript}</script>
  <script>
    window.__markdownReaderReady = false;
    function __decodeHtmlEntities(value) {
      return value
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&");
    }
    function __quoteMermaidLabel(label) {
      const value = label.trim();
      if (!value) return label;
      if (value.startsWith('"') && value.endsWith('"')) return value;
      return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    }
    function __normalizeMermaidLine(line) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("%%")) return line;
      let nextLine = line;
      nextLine = nextLine.replace(/^(\\s*subgraph\\s+[^\\s\\[]+\\[)(.+)(\\]\\s*)$/i, function(_match, start, label, end) {
        return start + __quoteMermaidLabel(label) + end;
      });
      nextLine = nextLine.replace(/(\\b[A-Za-z][\\w-]*\\s*\\[)([^\\]\\n]+)(\\])/g, function(_match, start, label, end) {
        return start + __quoteMermaidLabel(label) + end;
      });
      nextLine = nextLine.replace(/--\\s*([^"\\n][^-\\n]*?)\\s*-->/g, function(_match, label) {
        const value = label.trim();
        return value ? "-->|" + value.replace(/\\|/g, "/") + "|" : _match;
      });
      return nextLine;
    }
    function __normalizeMermaidDefinition(definition) {
      const normalized = definition.replace(/\\r\\n/g, "\\n");
      const trimmed = normalized.trimStart();
      if (!/^(graph|flowchart)\\b/i.test(trimmed)) return normalized;
      return normalized.split("\\n").map(__normalizeMermaidLine).join("\\n");
    }
    function __markdownReaderDone() {
      if (window.__markdownReaderReady) return;
      window.__markdownReaderReady = true;
      window.dispatchEvent(new Event("markdown-reader-ready"));
    }
    async function __renderMermaidBlocks() {
      const blocks = Array.from(document.querySelectorAll("[data-mermaid-block]"));
      if (window.console) console.log("[markdown-reader] mermaid blocks", blocks.length);
      if (!blocks.length || !window.mermaid) {
        __markdownReaderDone();
        return;
      }
      window.mermaid.initialize({ startOnLoad: false, securityLevel: "loose", theme: "neutral" });
      for (let index = 0; index < blocks.length; index += 1) {
        const block = blocks[index];
        const node = block.querySelector(".mermaid-diagram");
        const source = block.querySelector(".mermaid-source");
        const definition = __normalizeMermaidDefinition(
          __decodeHtmlEntities(block.querySelector(".mermaid-definition")?.textContent || "")
        );
        if (window.console) console.log("[markdown-reader] mermaid definition", index, definition);
        if (!definition.trim()) continue;
        try {
          const result = await window.mermaid.render("mdr-mermaid-" + index + "-" + Date.now(), definition);
          node.innerHTML = result.svg;
          source?.classList.remove("is-visible");
          if (typeof result.bindFunctions === "function") result.bindFunctions(node);
        } catch (_error) {
          node.innerHTML = '<div class="mermaid-error">Mermaid render failed.</div>';
          source?.classList.add("is-visible");
        }
      }
      __markdownReaderDone();
    }
    window.addEventListener("load", () => {
      Promise.resolve().then(__renderMermaidBlocks).catch(__markdownReaderDone);
      setTimeout(__markdownReaderDone, 4000);
    });
  </script>` : ""}
</body>
</html>`;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function normalizeMermaidLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("%%")) {
    return line;
  }

  let nextLine = line;

  nextLine = nextLine.replace(/^(\s*subgraph\s+[^\s\[]+\[)(.+)(\]\s*)$/i, (_match, start, label, end) => {
    return `${start}${quoteMermaidLabel(label)}${end}`;
  });

  nextLine = nextLine.replace(/(\b[A-Za-z][\w-]*\s*\[)([^\]\n]+)(\])/g, (_match, start, label, end) => {
    return `${start}${quoteMermaidLabel(label)}${end}`;
  });

  nextLine = nextLine.replace(/--\s*([^"\n][^-\n]*?)\s*-->/g, (_match, label) => {
    const value = label.trim();
    return value ? `-->|${escapeMermaidEdgeLabel(value)}|` : _match;
  });

  return nextLine;
}

function quoteMermaidLabel(label) {
  const value = label.trim();
  if (!value) {
    return label;
  }
  if (value.startsWith("\"") && value.endsWith("\"")) {
    return value;
  }
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function escapeMermaidEdgeLabel(label) {
  return label.trim().replace(/\|/g, "/");
}

function decorateMermaidBlocks(html) {
  return html.replace(
    /<pre>(<code\b[^>]*class="language-mermaid"[^>]*>)([\s\S]*?)<\/code><\/pre>/g,
    (_match, openTag, code) => {
      const source = decodeHtmlEntities(code).trim();
      return `<div class="mermaid-block" data-mermaid-block><div class="mermaid-diagram"></div><script type="text/plain" class="mermaid-definition">${escapeHtml(source)}</script><pre class="mermaid-source">${openTag}${code}</code></pre></div>`;
    },
  );
}

function stripResearchMarkers(markdown) {
  const lines = markdown.split(/\r?\n/);
  const referenceMap = buildReferenceMap(lines);

  return lines
    .map((line) => transformResearchLine(line, referenceMap))
    .join("\n")
    .replace(/[ \t]+\n/g, "\n");
}

function buildReferenceMap(lines) {
  const map = new Map();
  let inReferenceSection = false;
  let referenceNumber = 0;

  for (const line of lines) {
    if (/^###\s+.*(?:\u5f15\u7528\u7d22\u5f15|Reference Index|References)/i.test(line)) {
      inReferenceSection = true;
      continue;
    }

    if (inReferenceSection && /^###\s+/.test(line)) {
      inReferenceSection = false;
    }

    if (!inReferenceSection || !/^\s*-\s+/.test(line)) {
      continue;
    }

    const ids = [...line.matchAll(RESEARCH_CITE_PATTERN)].flatMap((match) => extractTurnIds(match[1]));
    if (ids.length === 0) {
      continue;
    }

    referenceNumber += 1;
    for (const id of ids) {
      map.set(id, referenceNumber);
    }
  }

  return map;
}

function transformResearchLine(line, referenceMap) {
  let nextLine = injectReferenceAnchor(line, referenceMap);
  nextLine = nextLine.replace(RESEARCH_ENTITY_PATTERN, (_match, payload) => parseEntityLabel(payload));
  nextLine = nextLine.replace(RESEARCH_CITE_PATTERN, (_match, payload) => renderCitationLinks(payload, referenceMap));
  return nextLine;
}

function injectReferenceAnchor(line, referenceMap) {
  if (!/^\s*-\s+/.test(line)) {
    return line;
  }

  const ids = [...line.matchAll(RESEARCH_CITE_PATTERN)].flatMap((match) => extractTurnIds(match[1]));
  const referenceNumbers = [...new Set(ids.map((id) => referenceMap.get(id)).filter(Boolean))];
  if (referenceNumbers.length === 0) {
    return line;
  }

  return line.replace(/^(\s*-\s+)/, `$1<span id="ref-${referenceNumbers[0]}" class="citation-target"></span>`);
}

function renderCitationLinks(payload, referenceMap) {
  const referenceNumbers = [...new Set(extractTurnIds(payload).map((id) => referenceMap.get(id)).filter(Boolean))];
  if (referenceNumbers.length === 0) {
    return "";
  }

  return referenceNumbers
    .map((number) => `<sup class="citation-ref"><a href="#ref-${number}">[${number}]</a></sup>`)
    .join("");
}

function extractTurnIds(payload) {
  return [...payload.matchAll(/turn\d+(?:search|view)\d+/g)].map((match) => match[0]);
}

function parseEntityLabel(payload) {
  try {
    const parsed = JSON.parse(payload);
    return Array.isArray(parsed) && typeof parsed[1] === "string" ? parsed[1] : "";
  } catch {
    return "";
  }
}
