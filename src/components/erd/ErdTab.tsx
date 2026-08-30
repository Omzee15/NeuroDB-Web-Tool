"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnections } from "@/contexts/ConnectionContext";
import { ErdSchema } from "@/types";
import { ErdCanvas } from "@/components/erd/ErdCanvas";

export function ErdTab() {
  const { activeConnectionId, schemaTree } = useConnections();
  const [schema, setSchema] = useState<ErdSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSchema, setSelectedSchema] = useState("public");

  const loadSchema = useCallback(async () => {
    if (!activeConnectionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/erd?connectionId=${activeConnectionId}&schema=${encodeURIComponent(selectedSchema)}`);
      if (res.ok) {
        setSchema(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [activeConnectionId, selectedSchema]);

  useEffect(() => {
    loadSchema();
  }, [loadSchema]);

  return (
    <div className="dbml-container">
      <div className="dbml-editor-section">
        <div className="dbml-editor-header">
          <h3>Schema</h3>
          <div className="dbml-actions">
            <select
              className="schema-type-select"
              value={selectedSchema}
              onChange={(e) => setSelectedSchema(e.target.value)}
            >
              {(schemaTree?.schemas ?? ["public"]).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button className="btn-secondary" onClick={loadSchema} disabled={loading}>
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 15 }}>
          {!schema || schema.tables.length === 0 ? (
            <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
              {loading ? "Loading schema..." : "No tables found in this schema."}
            </div>
          ) : (
            schema.tables.map((table) => (
              <div key={table.name} style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{table.name}</div>
                {table.columns.map((col) => (
                  <div key={col.name} style={{ fontSize: 12, color: "var(--text-secondary)", paddingLeft: 8 }}>
                    {col.name} <span style={{ opacity: 0.7 }}>{col.dataType}</span>
                    {col.isPrimaryKey ? " · PK" : ""}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="dbml-diagram-section">
        <div className="dbml-diagram-header">
          <h3>Database Diagram</h3>
        </div>
        {schema && schema.tables.length > 0 ? (
          <ErdCanvas schema={schema} />
        ) : (
          <div className="dbml-canvas">
            <div style={{ padding: 40, color: "var(--text-secondary)" }}>
              {loading ? "Loading..." : "No tables to visualize."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
