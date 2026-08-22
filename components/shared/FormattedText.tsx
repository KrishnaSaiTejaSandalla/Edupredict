"use client";

import React from "react";

type Props = {
  text: string;
  className?: string;
};

/**
 * Robust, lightweight Markdown & formatted text renderer for AI outputs.
 * Parses headers (##, ###), bold (**text**), bullet points (- / â€¢), numbered items,
 * tables, blockquotes, and horizontal dividers cleanly without raw markdown artifacts.
 */
export default function FormattedText({ text, className = "" }: Props) {
  if (!text) return null;

  const lines = text.split("\n");

  const renderFormattedInline = (content: string) => {
    // Replace **bold** with <strong>
    const parts = content.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        const innerText = part.slice(2, -2);
        return (
          <strong key={idx} className="font-semibold text-foreground">
            {innerText}
          </strong>
        );
      }
      // Replace *italic* with <em>
      if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
        const innerText = part.slice(1, -1);
        return <em key={idx} className="italic text-foreground/90">{innerText}</em>;
      }
      // Replace `code` with <code>
      if (part.startsWith("`") && part.endsWith("`")) {
        const innerText = part.slice(1, -1);
        return (
          <code key={idx} className="rounded bg-hover/80 px-1 py-0.5 font-mono text-[11px] text-cyan-400">
            {innerText}
          </code>
        );
      }
      return part;
    });
  };

  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let isNumberedList = false;

  let tableRows: string[][] = [];
  let isInsideTable = false;

  const flushTable = () => {
    if (tableRows.length > 0) {
      const headerRow = tableRows[0];
      const bodyRows = tableRows.slice(1);

      elements.push(
        <div key={`table-${elements.length}`} className="my-3 overflow-x-auto rounded-xl border border-border bg-background/50">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-hover/50 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                {headerRow.map((cell, cIdx) => (
                  <th key={cIdx} className="p-2.5 px-3 font-bold">
                    {renderFormattedInline(cell.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle text-foreground">
              {bodyRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-hover/30 transition">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-2.5 px-3">
                      {renderFormattedInline(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      isInsideTable = false;
    }
  };

  const flushList = () => {
    if (currentList.length > 0) {
      if (isNumberedList) {
        elements.push(
          <ol key={`ol-${elements.length}`} className="my-2 space-y-1.5 pl-1">
            {currentList}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="my-2 space-y-1.5 pl-1">
            {currentList}
          </ul>
        );
      }
      currentList = [];
    }
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();

    if (!line) {
      flushList();
      flushTable();
      return;
    }

    // Markdown Table row: starts and ends with | or contains multiple |
    if (line.startsWith("|") && line.endsWith("|")) {
      flushList();
      // Skip separator rows like |---|---|
      if (/^\|[-:\s|]+\|$/.test(line)) {
        return;
      }
      const cells = line.slice(1, -1).split("|");
      tableRows.push(cells);
      isInsideTable = true;
      return;
    } else if (isInsideTable) {
      flushTable();
    }

    // Horizontal rule: --- or ***
    if (/^[-*_]{3,}$/.test(line)) {
      flushList();
      elements.push(<hr key={idx} className="my-3 border-subtle" />);
      return;
    }

    // Blockquote: > text
    if (line.startsWith("> ")) {
      flushList();
      elements.push(
        <div key={idx} className="my-2 rounded-xl border-l-4 border-l-cyan-500 bg-cyan-500/5 p-3 text-xs italic text-foreground">
          {renderFormattedInline(line.replace(/^>\s+/, ""))}
        </div>
      );
      return;
    }

    // Headers (##, ###, #)
    if (line.startsWith("### ")) {
      flushList();
      elements.push(
        <h4 key={idx} className="text-xs font-bold text-foreground mt-3 mb-1.5 tracking-tight flex items-center gap-1.5">
          {renderFormattedInline(line.replace(/^###\s+/, ""))}
        </h4>
      );
      return;
    }

    if (line.startsWith("## ")) {
      flushList();
      elements.push(
        <h3 key={idx} className="text-xs font-bold uppercase tracking-wider text-cyan-500 dark:text-cyan-400 mt-4 mb-2 pb-1 border-b border-subtle/40 flex items-center gap-2">
          {renderFormattedInline(line.replace(/^##\s+/, ""))}
        </h3>
      );
      return;
    }

    if (line.startsWith("# ")) {
      flushList();
      elements.push(
        <h2 key={idx} className="text-sm font-extrabold text-foreground mt-4 mb-2">
          {renderFormattedInline(line.replace(/^#\s+/, ""))}
        </h2>
      );
      return;
    }

    // Bullet points (- or â€¢ or *)
    const bulletMatch = line.match(/^[-â€¢*]\s+(.*)/);
    if (bulletMatch) {
      if (isNumberedList) flushList();
      isNumberedList = false;
      currentList.push(
        <li key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-foreground">
          <span className="text-cyan-400 font-bold shrink-0 mt-0.5">â€¢</span>
          <span>{renderFormattedInline(bulletMatch[1])}</span>
        </li>
      );
      return;
    }

    // Numbered lists (1. 2. etc.)
    const numMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      if (!isNumberedList) flushList();
      isNumberedList = true;
      currentList.push(
        <li key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-foreground">
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-[10px] font-bold text-cyan-400 mt-0.5">
            {numMatch[1]}
          </span>
          <span>{renderFormattedInline(numMatch[2])}</span>
        </li>
      );
      return;
    }

    // Regular line / paragraph
    flushList();
    elements.push(
      <p key={idx} className="text-xs leading-relaxed text-foreground my-1">
        {renderFormattedInline(line)}
      </p>
    );
  });

  flushList();
  flushTable();

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
}
