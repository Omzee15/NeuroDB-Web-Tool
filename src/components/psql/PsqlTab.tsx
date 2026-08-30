"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { useConnections } from "@/contexts/ConnectionContext";
import { QueryResultData } from "@/types/api";

interface HistoryEntry {
  id: number;
  command: string;
  result?: QueryResultData;
  error?: string;
}

let entryCounter = 0;

export function PsqlTab() {
  const { activeConnectionId, liveConnections } = useConnections();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [input, setInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const dbName = liveConnections.find((c) => c.id === activeConnectionId)?.name ?? "";

  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight });
  }, [entries]);

  async function runCommand() {
    const command = input.trim();
    if (!command || !activeConnectionId || running) return;

    setRunning(true);
    setInput("");
    setCommandHistory((prev) => [command, ...prev]);
    setHistoryIndex(null);

    const id = entryCounter++;
    setEntries((prev) => [...prev, { id, command }]);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: activeConnectionId, sql: command }),
      });
      const data = await res.json();
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, result: res.ok ? data : undefined, error: res.ok ? undefined : data.error } : e))
      );
    } catch (err) {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, error: err instanceof Error ? err.message : "Query failed" } : e))
      );
    } finally {
      setRunning(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      runCommand();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIndex = historyIndex === null ? 0 : Math.min(historyIndex + 1, commandHistory.length - 1);
      setHistoryIndex(nextIndex);
      setInput(commandHistory[nextIndex]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === null) return;
      const nextIndex = historyIndex - 1;
      if (nextIndex < 0) {
        setHistoryIndex(null);
        setInput("");
      } else {
        setHistoryIndex(nextIndex);
        setInput(commandHistory[nextIndex]);
      }
    }
  }

  function renderResultTable(result: QueryResultData) {
    if (result.rows.length === 0) {
      return <div>{result.command} — {result.rowCount} row(s) in {result.executionTimeMs}ms</div>;
    }
    return (
      <pre>
        {formatAsciiTable(result.fields, result.rows)}
        {"\n"}({result.rowCount} row{result.rowCount === 1 ? "" : "s"}, {result.executionTimeMs}ms)
      </pre>
    );
  }

  return (
    <div className="psql-container">
      <div className="psql-output" ref={outputRef}>
        <div className="terminal-welcome">
          psql (NeuroDB Web) — connected to {dbName || "no database"}
          <br />
          Type SQL and press Enter to run it.
        </div>
        {entries.map((entry) => (
          <div key={entry.id} className="psql-command">
            <div className="psql-prompt-line">
              {dbName || "db"}=# {entry.command}
            </div>
            {entry.error ? (
              <div className="psql-error">ERROR: {entry.error}</div>
            ) : entry.result ? (
              <div className="psql-result">{renderResultTable(entry.result)}</div>
            ) : (
              <div className="psql-result">Running...</div>
            )}
          </div>
        ))}
      </div>
      <div className="psql-input-container">
        <span className="psql-prompt">{dbName || "db"}=#</span>
        <input
          type="text"
          className="psql-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!activeConnectionId || running}
          placeholder={activeConnectionId ? "Enter SQL command..." : "Connect to a database first"}
          autoFocus
          spellCheck={false}
        />
      </div>
    </div>
  );
}

function formatAsciiTable(fields: string[], rows: Record<string, unknown>[]): string {
  const widths = fields.map((f) =>
    Math.max(f.length, ...rows.map((r) => formatValue(r[f]).length))
  );

  const headerLine = fields.map((f, i) => f.padEnd(widths[i])).join(" | ");
  const separatorLine = widths.map((w) => "-".repeat(w + (w === widths[0] ? 1 : 1))).join("+");
  const rowLines = rows.map((row) => fields.map((f, i) => formatValue(row[f]).padEnd(widths[i])).join(" | "));

  return [headerLine, separatorLine, ...rowLines].join("\n");
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
