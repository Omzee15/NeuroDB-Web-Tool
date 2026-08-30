"use client";

import { useEffect, useState } from "react";
import { X, Check, ArrowRight } from "lucide-react";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings/gemini-key")
      .then((r) => r.json())
      .then((data) => setHasKey(!!data.hasKey));
  }, []);

  async function handleSave() {
    const trimmed = apiKey.trim();
    if (!trimmed) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/settings/gemini-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: trimmed }),
      });
      const data = await res.json();
      if (res.ok) {
        setHasKey(true);
        setApiKey("");
        setStatus({ ok: true, message: "API key saved." });
      } else {
        setStatus({ ok: false, message: data.error || "Failed to save key" });
      }
    } catch (err) {
      setStatus({ ok: false, message: err instanceof Error ? err.message : "Failed to save key" });
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    setStatus(null);
    try {
      await fetch("/api/settings/gemini-key", { method: "DELETE" });
      setHasKey(false);
      setStatus({ ok: true, message: "API key removed." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="btn-icon" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        <div className="connection-form">
          <div className="form-group">
            <label>Gemini API Key</label>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
              Used for AI SQL generation, explain, and the chat assistant. Your key is used only for your
              own requests.{" "}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--accent-hover)", display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                Get a free key <ArrowRight size={12} />
              </a>
            </p>
            <div style={{ fontSize: 12, marginBottom: 8, color: hasKey ? "var(--success)" : "var(--text-secondary)" }}>
              {hasKey === null ? "Checking..." : hasKey ? "A key is currently saved." : "No key saved — using the server default, if any."}
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
            />
          </div>

          {status && (
            <div
              className={`connection-status ${status.ok ? "success" : "error"}`}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              {status.ok ? <Check size={14} /> : <X size={14} />}
              {status.message}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button className="btn-secondary" onClick={handleClear} disabled={saving || !hasKey}>
            Remove Key
          </button>
          <div className="form-actions-right">
            <button className="btn-secondary" onClick={onClose}>
              Close
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={saving || !apiKey.trim()}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
