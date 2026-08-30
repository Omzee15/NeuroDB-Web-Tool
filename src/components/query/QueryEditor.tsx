"use client";

import { KeyboardEvent, UIEvent, useMemo, useRef } from "react";
import { Play, MessageCircleQuestion } from "lucide-react";
import { highlightSql } from "@/lib/sql/highlight";

interface QueryEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute: () => void;
  executing: boolean;
  limit: string;
  onLimitChange: (limit: string) => void;
  onExplain?: () => void;
  explaining?: boolean;
}

export function QueryEditor({
  value,
  onChange,
  onExecute,
  executing,
  limit,
  onLimitChange,
  onExplain,
  explaining,
}: QueryEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const lineNumbers = useMemo(() => {
    const count = value.split("\n").length;
    return Array.from({ length: count }, (_, i) => i + 1).join("\n");
  }, [value]);

  const highlightedHtml = useMemo(() => highlightSql(value), [value]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onExecute();
    }
  }

  function handleScroll(e: UIEvent<HTMLTextAreaElement>) {
    const { scrollTop, scrollLeft } = e.currentTarget;
    if (highlightRef.current) {
      highlightRef.current.scrollTop = scrollTop;
      highlightRef.current.scrollLeft = scrollLeft;
    }
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = scrollTop;
    }
  }

  return (
    <div className="editor-container">
      <div className="editor-wrapper">
        <div className="line-numbers" ref={lineNumbersRef}>
          {lineNumbers}
        </div>
        <div
          className="syntax-highlight-overlay"
          ref={highlightRef}
          dangerouslySetInnerHTML={{ __html: highlightedHtml + "\n" }}
        />
        <textarea
          ref={textareaRef}
          id="queryEditor"
          className="query-editor"
          placeholder={"-- Write your SQL query here\n-- or use AI to generate it for you"}
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
        />
      </div>

      <div className="editor-actions">
        <button className="btn-primary" onClick={onExecute} disabled={executing}>
          <Play size={14} />
          {executing ? "Running..." : "Execute"}
        </button>
        {onExplain && (
          <button className="btn-secondary" onClick={onExplain} disabled={explaining || !value.trim()}>
            <MessageCircleQuestion size={14} />
            {explaining ? "Explaining..." : "Explain"}
          </button>
        )}
        <div className="editor-actions-divider" />
        <div className="limit-dropdown-container">
          <label className="limit-label">Limit:</label>
          <select className="limit-dropdown" value={limit} onChange={(e) => onLimitChange(e.target.value)}>
            <option value="100">100</option>
            <option value="1000">1000</option>
            <option value="10000">10000</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>
    </div>
  );
}
