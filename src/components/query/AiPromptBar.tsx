"use client";

import { useState, KeyboardEvent } from "react";
import { Sparkles, History, Hourglass, X } from "lucide-react";
import { useConnections } from "@/contexts/ConnectionContext";

interface AiPromptBarProps {
  onGenerated: (sql: string) => void;
  currentSql: string;
}

export function AiPromptBar({ onGenerated }: AiPromptBarProps) {
  const { activeConnectionId } = useConnections();
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  async function generate() {
    const trimmed = prompt.trim();
    if (!trimmed || !activeConnectionId || generating) return;

    setGenerating(true);
    setQuotaExceeded(false);
    setHistory((prev) => [trimmed, ...prev.filter((p) => p !== trimmed)].slice(0, 10));

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, connectionId: activeConnectionId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onGenerated(data.query);
      } else if (data.errorType === "quota_exhausted") {
        setQuotaExceeded(true);
      } else {
        onGenerated(`-- Error: ${data.error}`);
      }
    } catch (err) {
      onGenerated(`-- Error: ${err instanceof Error ? err.message : "Failed to generate SQL"}`);
    } finally {
      setGenerating(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") generate();
  }

  return (
    <div className="ai-prompt-bar">
      <div className="ai-input-wrapper">
        <input
          type="text"
          className="ai-input"
          placeholder="Ask AI to generate SQL... (e.g., 'Show all users created this month')"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!activeConnectionId}
        />
        <button className="btn-icon ai-history-btn" title="Prompt History" onClick={() => setHistoryOpen((v) => !v)}>
          <History size={16} />
        </button>
        {historyOpen && (
          <div className="ai-history-dropdown">
            <div className="ai-history-header">Recent Prompts</div>
            <div className="ai-history-list">
              {history.length === 0 && <div className="ai-history-empty">No prompt history yet</div>}
              {history.map((p, i) => (
                <div
                  key={i}
                  className="ai-history-item"
                  onClick={() => {
                    setPrompt(p);
                    setHistoryOpen(false);
                  }}
                >
                  {p}
                </div>
              ))}
            </div>
            {history.length > 0 && (
              <div className="ai-history-footer">
                <button className="btn-text" onClick={() => setHistory([])}>
                  Clear History
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <button className="btn-primary" onClick={generate} disabled={!activeConnectionId || generating}>
        <Sparkles size={14} />
        {generating ? "Generating..." : "Generate"}
      </button>

      {quotaExceeded && (
        <div className="ai-quota-banner">
          <span className="ai-quota-icon">
            <Hourglass size={16} />
          </span>
          <div className="ai-quota-text">
            <strong>The AI model is running busy right now.</strong> The free usage limit has been reached. Please try
            again shortly.
          </div>
          <button className="btn-icon ai-quota-close" onClick={() => setQuotaExceeded(false)}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
