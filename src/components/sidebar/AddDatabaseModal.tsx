"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useConnections } from "@/contexts/ConnectionContext";
import { DatabasePicker } from "@/components/sidebar/DatabasePicker";
import { SavedServerRecord } from "@/types/api";

interface Props {
  server: SavedServerRecord;
  onClose: () => void;
}

export function AddDatabaseModal({ server, onClose }: Props) {
  const { addDatabases } = useConnections();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd() {
    if (selected.length === 0) return;
    setSubmitting(true);
    setError(null);
    const res = await addDatabases(server.id, selected);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onClose();
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add databases — {server.name}</h2>
          <button className="btn-icon" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        <div className="connection-form">
          <DatabasePicker
            request={{ serverId: server.id }}
            alreadyAdded={server.databases.map((d) => d.name)}
            selected={selected}
            onChange={setSelected}
            autoLoad
          />
          {error && (
            <div className="connection-status error" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <X size={14} />
              {error}
            </div>
          )}
        </div>

        <div className="form-actions">
          <div />
          <div className="form-actions-right">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleAdd}
              disabled={submitting || selected.length === 0}
            >
              {submitting ? "Adding..." : `Add ${selected.length || ""}`.trim()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
