"use client";

import { useState, KeyboardEvent } from "react";
import { X, Bot } from "lucide-react";
import { useConnections } from "@/contexts/ConnectionContext";
import { useAiPanel } from "@/contexts/AiPanelContext";

export function AiPanel() {
  const { activeConnectionId, liveConnections } = useConnections();
  const { setOpen, messages, setMessages } = useAiPanel();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const connectionName = liveConnections.find((c) => c.id === activeConnectionId)?.name;

  async function send() {
    const trimmed = input.trim();
    if (!trimmed || !activeConnectionId || sending) return;

    const nextMessages = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          connectionId: activeConnectionId,
          connectionName,
          history: messages,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages([...nextMessages, { role: "assistant", content: data.response }]);
      } else {
        setMessages([...nextMessages, { role: "assistant", content: `Error: ${data.error || "Failed to respond"}` }]);
      }
    } catch (err) {
      setMessages([
        ...nextMessages,
        { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Failed to respond"}` },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="ai-panel">
      <div className="ai-panel-header">
        <h3>AI Assistant</h3>
        <div className="ai-connection-indicator">{connectionName || "No connection"}</div>
        <button className="btn-icon" onClick={() => setOpen(false)} title="Close">
          <X size={16} />
        </button>
      </div>

      <div className="ai-chat-container">
        {messages.length === 0 && (
          <div className="ai-welcome" style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <Bot size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>Hi! I&apos;m your AI assistant. I can help you with SQL queries, explain database concepts, and more!</span>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`ai-message ${m.role}`}>
            {m.content}
          </div>
        ))}
        {sending && <div className="ai-message assistant">Thinking...</div>}
      </div>

      <div className="ai-input-container">
        <textarea
          className="ai-chat-input"
          placeholder="Ask me anything about your database..."
          rows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!activeConnectionId}
        />
        <button className="btn-primary" onClick={send} disabled={!activeConnectionId || sending}>
          Send
        </button>
      </div>
    </div>
  );
}
