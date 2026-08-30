"use client";

import { useMemo, useState, FormEvent } from "react";
import { X, Check } from "lucide-react";
import { useConnections } from "@/contexts/ConnectionContext";
import { DatabasePicker } from "@/components/sidebar/DatabasePicker";

interface ConnectionModalProps {
  onClose: () => void;
}

export function ConnectionModal({ onClose }: ConnectionModalProps) {
  const { createServer } = useConnections();
  const [useUrl, setUseUrl] = useState(false);
  const [name, setName] = useState("");
  const [connectionString, setConnectionString] = useState("");
  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState(5432);
  const [user, setUser] = useState("postgres");
  const [password, setPassword] = useState("");
  const [ssl, setSsl] = useState(false);
  const [selectedDbs, setSelectedDbs] = useState<string[]>([]);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reachable, setReachable] = useState(false);

  const listRequest = useMemo(() => {
    if (useUrl) {
      return connectionString.trim() ? { connectionString: connectionString.trim(), ssl } : null;
    }
    return host && user ? { name: name.trim(), host, port: Number(port) || 5432, user, password, ssl } : null;
  }, [useUrl, connectionString, host, port, user, password, ssl, name]);

  function serverBody() {
    return {
      name: name.trim() || host || "Server",
      host,
      port: Number(port) || 5432,
      user,
      password,
      ssl,
      connectionString: useUrl ? connectionString.trim() : undefined,
      databases: selectedDbs,
    };
  }

  async function handleTest() {
    setTesting(true);
    setStatus(null);
    try {
      const res = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || host,
          host,
          port: Number(port) || 5432,
          user,
          password,
          database: useUrl ? "" : "postgres",
          ssl,
          connectionString: useUrl ? connectionString.trim() : undefined,
          save: false,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetch(`/api/connect?id=${data.id}`, { method: "DELETE" });
        setStatus({ ok: true, message: "Connection successful — pick databases below" });
        setReachable(true);
      } else {
        setStatus({ ok: false, message: data.error || "Connection failed" });
        setReachable(false);
      }
    } catch (err) {
      setStatus({ ok: false, message: err instanceof Error ? err.message : "Connection failed" });
      setReachable(false);
    } finally {
      setTesting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (selectedDbs.length === 0) {
      setStatus({ ok: false, message: "Select at least one database to add" });
      return;
    }
    setSubmitting(true);
    setStatus(null);
    const result = await createServer(serverBody());
    setSubmitting(false);
    if (result.error) {
      setStatus({ ok: false, message: result.error });
      return;
    }
    onClose();
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Connection</h2>
          <button className="btn-icon" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="connection-form">
            <div className="form-group">
              <label>Connection Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My PostgreSQL Server"
              />
            </div>

            <div className="form-group">
              <label>
                <input type="checkbox" checked={useUrl} onChange={(e) => setUseUrl(e.target.checked)} /> Use Database
                URL
              </label>
            </div>

            {useUrl ? (
              <div className="form-group">
                <label>Connection URL</label>
                <input
                  type="text"
                  value={connectionString}
                  onChange={(e) => {
                    setConnectionString(e.target.value);
                    setReachable(false);
                  }}
                  placeholder="postgresql://user:password@host:port/database"
                  required
                />
              </div>
            ) : (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label>Host</label>
                    <input
                      type="text"
                      value={host}
                      onChange={(e) => {
                        setHost(e.target.value);
                        setReachable(false);
                      }}
                      placeholder="localhost"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Port</label>
                    <input
                      type="number"
                      value={port}
                      onChange={(e) => {
                        setPort(Number(e.target.value));
                        setReachable(false);
                      }}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>User</label>
                  <input
                    type="text"
                    value={user}
                    onChange={(e) => {
                      setUser(e.target.value);
                      setReachable(false);
                    }}
                    placeholder="postgres"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setReachable(false);
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>
                    <input type="checkbox" checked={ssl} onChange={(e) => setSsl(e.target.checked)} /> Use SSL
                  </label>
                </div>
              </>
            )}

            <DatabasePicker
              request={listRequest}
              selected={selectedDbs}
              onChange={setSelectedDbs}
              autoLoad={reachable}
            />

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
            <button type="button" className="btn-secondary" onClick={handleTest} disabled={testing}>
              {testing ? "Testing..." : "Test Connection"}
            </button>
            <div className="form-actions-right">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={submitting || selectedDbs.length === 0}>
                {submitting ? "Saving..." : `Add ${selectedDbs.length || ""} database${selectedDbs.length === 1 ? "" : "s"}`.trim()}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
