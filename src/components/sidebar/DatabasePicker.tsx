"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Database } from "lucide-react";

interface Props {
  /** payload sent to /api/servers/list-databases: either {serverId} or raw creds */
  request: Record<string, unknown> | null;
  /** names already registered (disabled + checked, not togglable) */
  alreadyAdded?: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** auto-load the list as soon as `request` becomes non-null */
  autoLoad?: boolean;
}

const SYSTEM_DBS = new Set(["postgres", "template0", "template1"]);

export function DatabasePicker({ request, alreadyAdded = [], selected, onChange, autoLoad }: Props) {
  const [databases, setDatabases] = useState<string[] | null>(null);
  const [existing, setExisting] = useState<string[]>(alreadyAdded);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!request) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/servers/list-databases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to list databases");
        setDatabases(null);
        return;
      }
      setDatabases(data.databases as string[]);
      setExisting((data.existing as string[]) ?? alreadyAdded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to list databases");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (autoLoad && request) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad, JSON.stringify(request)]);

  function toggle(name: string) {
    if (existing.includes(name)) return;
    onChange(selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name]);
  }

  const registered = new Set(existing);

  return (
    <div className="db-picker">
      <div className="db-picker-head">
        <span className="db-picker-label">Databases</span>
        <button type="button" className="btn-secondary btn-xs" onClick={load} disabled={loading || !request}>
          <RefreshCw size={12} />
          {databases ? "Reload" : "Load databases"}
        </button>
      </div>

      {loading && <div className="db-picker-msg">Loading databases…</div>}
      {error && <div className="db-picker-msg error">{error}</div>}
      {!loading && !error && databases && databases.length === 0 && (
        <div className="db-picker-msg">No databases found on this server.</div>
      )}

      {databases && databases.length > 0 && (
        <div className="db-picker-list">
          {databases.map((name) => {
            const isRegistered = registered.has(name);
            const checked = isRegistered || selected.includes(name);
            return (
              <label key={name} className={`db-picker-item ${isRegistered ? "disabled" : ""}`}>
                <input type="checkbox" checked={checked} disabled={isRegistered} onChange={() => toggle(name)} />
                <Database size={13} />
                <span className="db-picker-name">{name}</span>
                {SYSTEM_DBS.has(name.toLowerCase()) && <span className="db-picker-tag">system</span>}
                {isRegistered && <span className="db-picker-tag">added</span>}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
