"use client";

import { useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import {
  Bold,
  Code,
  Eye,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Italic,
  Link,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Pencil,
  Quote,
  SquareCode,
  Strikethrough,
  Table,
} from "lucide-react";

/**
 * Editor de markdown (estilo GitHub): aba de escrita com toolbar e aba de
 * prévia renderizando um subconjunto bem comportado de markdown.
 *
 * Não depende de libs externas: o renderer de prévia escapa o HTML antes de
 * qualquer transformação e só gera tags de uma lista branca.
 */

type MarkdownEditorProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  minRows?: number;
};

type FormatId =
  | "bold"
  | "italic"
  | "strike"
  | "inline-code"
  | "link"
  | "image"
  | "h1"
  | "h2"
  | "h3"
  | "quote"
  | "ul"
  | "ol"
  | "task"
  | "code-block"
  | "table"
  | "hr";

type ToolbarItem = {
  id: FormatId;
  label: string;
  Icon: ComponentType<{ className?: string }>;
};

const TOOLBAR_ITEMS: ToolbarItem[] = [
  { id: "bold", label: "Negrito", Icon: Bold },
  { id: "italic", label: "Itálico", Icon: Italic },
  { id: "strike", label: "Tachado", Icon: Strikethrough },
  { id: "inline-code", label: "Código", Icon: Code },
  { id: "h1", label: "Título 1", Icon: Heading1 },
  { id: "h2", label: "Título 2", Icon: Heading2 },
  { id: "h3", label: "Título 3", Icon: Heading3 },
  { id: "quote", label: "Citação", Icon: Quote },
  { id: "link", label: "Link", Icon: Link },
  { id: "image", label: "Imagem", Icon: Image },
  { id: "ul", label: "Lista", Icon: List },
  { id: "ol", label: "Lista ordenada", Icon: ListOrdered },
  { id: "task", label: "Lista de tarefas", Icon: ListChecks },
  { id: "code-block", label: "Bloco de código", Icon: SquareCode },
  { id: "table", label: "Tabela", Icon: Table },
  { id: "hr", label: "Linha horizontal", Icon: Minus },
];

// formatos que apenas envolvem o trecho selecionado
const WRAP_FORMATS: Record<string, { prefix: string; suffix: string }> = {
  bold: { prefix: "**", suffix: "**" },
  italic: { prefix: "*", suffix: "*" },
  strike: { prefix: "~~", suffix: "~~" },
  "inline-code": { prefix: "`", suffix: "`" },
  link: { prefix: "[](", suffix: ")" },
  image: {
    prefix: "![](",
    suffix: ")",
  },
};

// formatos que prefixam linhas inteiras (mantendo a seleção multi-linha).
const LINE_FORMATS: Record<string, string> = {
  h1: "# ",
  h2: "## ",
  h3: "### ",
  quote: "> ",
  ul: "- ",
  ol: "1. ",
  task: "- [ ] ",
};

function applyFormat(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  format: FormatId,
): { value: string; selectionStart: number; selectionEnd: number } {
  const before = value.slice(0, selectionStart);
  const after = value.slice(selectionEnd);
  const selected = value.slice(selectionStart, selectionEnd);

  const wrap = WRAP_FORMATS[format];
  if (wrap) {
    const text = selected;
    const next = `${before}${wrap.prefix}${text}${wrap.suffix}${after}`;
    const caret = selectionStart + wrap.prefix.length;
    return {
      value: next,
      selectionStart: caret,
      selectionEnd: caret + text.length,
    };
  }

  const linePrefix = LINE_FORMATS[format];
  if (linePrefix) {
    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    let lineEnd = value.indexOf("\n", selectionEnd);
    if (lineEnd === -1) lineEnd = value.length;

    const block = value.slice(lineStart, lineEnd);
    const prefixed = block
      .split("\n")
      .map((line) => linePrefix + line)
      .join("\n");
    const next = `${value.slice(0, lineStart)}${prefixed}${value.slice(lineEnd)}`;
    const caret = lineStart + prefixed.length;
    return { value: next, selectionStart: caret, selectionEnd: caret };
  }

  if (format === "code-block") {
    const text = selected || "";
    const block = text ? "```\n" + text + "\n```" : "```\n\n```";
    const next = `${before}${block}${after}`;
    const caret = selectionStart + 4;
    return {
      value: next,
      selectionStart: caret,
      selectionEnd: caret + (text ? text.length : 0),
    };
  }

  if (format === "table") {
    const template = "| Título 1 | Título 2 |\n| --- | --- |\n|  |  |";
    const needsNewline = selectionStart > 0 && !before.endsWith("\n");
    const block = (needsNewline ? "\n" : "") + template;
    const next = `${before}${block}${after}`;
    const caret = selectionStart + block.length;
    return { value: next, selectionStart: caret, selectionEnd: caret };
  }

  if (format === "hr") {
    const block = "\n---\n";
    const next = `${before}${block}${after}`;
    const caret = selectionStart + block.length;
    return { value: next, selectionStart: caret, selectionEnd: caret };
  }

  return { value, selectionStart, selectionEnd };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isSafeUrl(raw: string): boolean {
  return /^(https?:|mailto:)/i.test(raw) || raw.startsWith("#");
}

function renderInline(text: string): string {
  let html = escapeHtml(text);

  // código inline
  html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");

  // imagens antes de links para não virar link
  html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (match, alt, href) => {
    if (!isSafeUrl(href)) return match;
    return `<img src="${href}" alt="${alt}" />`;
  });

  // links ([texto](url))
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, href) => {
    if (!isSafeUrl(href)) return match;
    return `<a href="${href}" target="_blank" rel="noreferrer">${label}</a>`;
  });

  // negrito
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");

  // itálico
  html = html.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  html = html.replace(/(^|[^_\w])_([^_\n]+)_(?!_)/g, "$1<em>$2</em>");

  // tachado
  html = html.replace(/~~([^~]+)~~/g, "<del>$1</del>");

  return html;
}

function renderTable(lines: string[], start: number): string {
  const header = lines[start];
  const separator = lines[start + 1];

  const alignments = separator
    .split("|")
    .slice(1, -1)
    .map((cell) => {
      const text = cell.trim();
      if (text.startsWith(":") && text.endsWith(":")) return "center";
      if (text.endsWith(":")) return "right";
      return "left";
    });

  const renderRow = (row: string, cellsTag: "td" | "th") => {
    const cells = row
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length === 0) return "";
    return `<tr>${cells
      .map((cell, index) => {
        const align = alignments[index];
        const style =
          align && align !== "left" ? ` style="text-align:${align}"` : "";
        return `<${cellsTag}${style}>${renderInline(cell)}</${cellsTag}>`;
      })
      .join("")}</tr>`;
  };

  const bodyRows: string[] = [];
  let index = start + 2;
  while (index < lines.length && lines[index].trim().startsWith("|")) {
    bodyRows.push(renderRow(lines[index], "td"));
    index += 1;
  }

  return `<table><thead>${renderRow(header, "th")}</thead><tbody>${bodyRows.join("")}</tbody></table>`;
}

/**
 * Renderiza markdown para HTML de pré-visualização.
 *
 * O conteúdo é escapado antes de qualquer transformação e as tags geradas são
 * de uma lista branca (headings, parágrafos, listas, citações, code/pre,
 * links, imagens, tabelas, hr), o que evita injeção de HTML/script no preview.
 */
function renderMarkdown(source: string): string {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");

  // extrai blocos de código cercados (```) para proteger do restante do parser
  const fences: string[] = [];
  const sanitized: string[] = [];
  let inFence = false;

  for (const line of lines) {
    const fence = line.match(/^\s*(```|~~~)\s*([\w+.-]*)\s*$/);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fences.push("");
        sanitized.push(`\u0000FENCE${fences.length - 1}\u0000`);
      } else {
        inFence = false;
      }
      continue;
    }
    if (inFence) {
      const last = fences.length - 1;
      fences[last] += (fences[last] ? "\n" : "") + line;
      continue;
    }
    sanitized.push(line);
  }

  const out: string[] = [];
  let index = 0;

  while (index < sanitized.length) {
    const line = sanitized[index];
    const trimmed = line.trim();

    if (trimmed === "") {
      index += 1;
      continue;
    }

    // bloco de código protegido
    const fenceRef = trimmed.match(/^\u0000FENCE(\d+)\u0000$/);
    if (fenceRef) {
      out.push(
        `<pre><code>${escapeHtml(fences[Number(fenceRef[1])])}</code></pre>`,
      );
      index += 1;
      continue;
    }

    // heading
    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    // linha horizontal
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      out.push("<hr />");
      index += 1;
      continue;
    }

    // tabela
    if (trimmed.startsWith("|")) {
      const next = sanitized[index + 1]?.trim() ?? "";
      const isSeparator =
        /^\|?[\s:|-]+\|[\s:|-]*$/.test(next) && next.includes("-");
      if (isSeparator) {
        out.push(renderTable(sanitized, index));
        index += 2;
        while (
          index < sanitized.length &&
          sanitized[index].trim().startsWith("|")
        ) {
          index += 1;
        }
        continue;
      }
    }
    // citação (agrupa linhas consecutivas)
    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      while (index < sanitized.length && sanitized[index].startsWith(">")) {
        quoteLines.push(sanitized[index].replace(/^>\s?/, ""));
        index += 1;
      }
      out.push(
        `<blockquote>${quoteLines.map(renderInline).join("<br />")}</blockquote>`,
      );
      continue;
    }

    // listas
    const itemTask = trimmed.match(/^[-*+]\s+\[([ xX])\]\s+(.+)$/);
    const itemUl = trimmed.match(/^[-*+]\s+(.+)$/);
    const itemOl = trimmed.match(/^\d+\.\s+(.+)$/);

    if (itemTask || itemUl || itemOl) {
      const ordered = Boolean(itemOl) && !itemTask;
      type ListItem = { text: string; checked?: boolean };
      const items: ListItem[] = [];
      let lineIndex = index;

      while (lineIndex < sanitized.length) {
        const current = sanitized[lineIndex].trim();
        const currentTask = current.match(/^[-*+]\s+\[([ xX])\]\s+(.+)$/);
        const currentUl = current.match(/^[-*+]\s+(.+)$/);
        const currentOl = current.match(/^\d+\.\s+(.+)$/);

        if (currentTask) {
          items.push({
            text: currentTask[2],
            checked: currentTask[1].toLowerCase() === "x",
          });
        } else if (ordered && currentOl) {
          items.push({ text: currentOl[1] });
        } else if (!ordered && currentUl) {
          items.push({ text: currentUl[1] });
        } else {
          break;
        }
        lineIndex += 1;
      }

      const tag = ordered ? "ol" : "ul";
      const body = items
        .map((item) => {
          if (item.checked !== undefined) {
            return `<li><span class="task-item"><input type="checkbox" ${
              item.checked ? "checked " : ""
            }disabled /><span>${renderInline(item.text)}</span></span></li>`;
          }
          return `<li>${renderInline(item.text)}</li>`;
        })
        .join("");
      out.push(`<${tag}>${body}</${tag}>`);
      index = lineIndex;
      continue;
    }

    // parágrafo (agrupa linhas consecutivas comuns)
    const paragraphLines: string[] = [];
    while (index < sanitized.length) {
      const current = sanitized[index];
      const currentTrim = current.trim();
      const breaks =
        currentTrim === "" ||
        /^(#{1,6})\s+/.test(currentTrim) ||
        /^(-{3,}|\*{3,}|_{3,})$/.test(currentTrim) ||
        current.startsWith(">") ||
        /^[-*+]\s+/.test(currentTrim) ||
        /^\d+\.\s+/.test(currentTrim) ||
        (currentTrim.startsWith("|") &&
          /^\|?[\s:|-]+\|/.test(sanitized[index + 1]?.trim() ?? ""));
      if (breaks) break;
      paragraphLines.push(current);
      index += 1;
    }

    if (paragraphLines.length > 0) {
      out.push(`<p>${paragraphLines.map(renderInline).join("<br />")}</p>`);
      continue;
    }

    index += 1;
  }

  return out.join("\n");
}

export function MarkdownEditor({
  id,
  value,
  onChange,
  minRows = 8,
}: MarkdownEditorProps) {
  const [view, setView] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const previewHtml = useMemo(() => renderMarkdown(value), [value]);
  const previewMinHeight = `${Math.max(minRows, 4) * 1.5}rem`;

  function handleFormat(format: FormatId) {
    const el = textareaRef.current;
    if (!el) return;

    const result = applyFormat(
      value,
      el.selectionStart,
      el.selectionEnd,
      format,
    );
    onChange(result.value);

    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-stone-200 bg-gradient-to-b from-stone-100 to-stone-200/70 px-2 py-1.5">
        <div className="relative grid grid-cols-2 rounded-full border border-stone-300 bg-stone-200/70 p-0.5 text-xs font-medium">
          <span
            aria-hidden="true"
            className="absolute inset-y-0.5 left-0.5 w-[calc(50%-0.25rem)] rounded-full bg-white shadow-sm transition-transform duration-300 ease-out"
            style={{ transform: `translateX(${view === "write" ? 0 : 100}%)` }}
          />

          <button
            type="button"
            onClick={() => setView("write")}
            aria-pressed={view === "write"}
            className={`relative z-10 inline-flex items-center justify-center gap-1.5 rounded-full px-2.5 py-1 transition cursor-pointer ${
              view === "write"
                ? "text-stone-800"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            <Pencil className="h-3.5 w-3.5" />
            Escrever
          </button>
          <button
            type="button"
            onClick={() => setView("preview")}
            aria-pressed={view === "preview"}
            className={`relative z-10 inline-flex items-center justify-center gap-1.5 rounded-full px-2.5 py-1 transition cursor-pointer ${
              view === "preview"
                ? "text-stone-800"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            Prévia
          </button>
        </div>

        <div className="mx-1 h-4 w-px bg-stone-200" />
        {TOOLBAR_ITEMS.map(({ id: itemId, label, Icon }) => (
          <button
            key={itemId}
            type="button"
            title={label}
            disabled={view !== "write"}
            aria-label={label}
            onClick={() => handleFormat(itemId)}
            className="rounded-full p-1.5 text-stone-500 transition hover:bg-stone-200 hover:text-stone-800 cursor-pointer disabled:cursor-not-allowed disabled:text-stone-400 disabled:hover:bg-white transition-colors duration-500 ease-in-out"
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>

      {view === "write" ? (
        <textarea
          id={id}
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (
              (event.metaKey || event.ctrlKey) &&
              event.key.toLowerCase() === "b"
            ) {
              event.preventDefault();
              handleFormat("bold");
            }
          }}
          rows={minRows}
          className="w-full min-h-[25rem] resize-y bg-stone-50/50 px-4 py-3 font-mono text-sm leading-relaxed text-stone-800 placeholder:text-stone-400 focus:outline-none"
        />
      ) : (
        <div
          className="text-editor-preview w-full px-5 py-4 text-sm text-stone-800"
          style={{ minHeight: previewMinHeight }}
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      )}
    </div>
  );
}
