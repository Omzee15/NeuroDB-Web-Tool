"use client";

import { useState } from "react";
import { Plus, X, Trash2, ChevronRight, Server, Database } from "lucide-react";
import { useConnections } from "@/contexts/ConnectionContext";
import { ConnectionModal } from "@/components/sidebar/ConnectionModal";
import { AddDatabaseModal } from "@/components/sidebar/AddDatabaseModal";
import { SavedServerRecord } from "@/types/api";

interface SidebarProps {
  onSelectTable: (table: { schema: string; name: string; type: "table" | "view" } | null) => void;
  width?: number;
}

export function Sidebar({ onSelectTable, width }: SidebarProps) {
  const {
    servers,
    liveConnections,
    activeConnectionId,
    setActiveConnectionId,
    activateDatabase,
    disconnect,
    removeDatabase,
    deleteServer,
  } = useConnections();

  const [modalOpen, setModalOpen] = useState(false);
  const [addDbServer, setAddDbServer] = useState<SavedServerRecord | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function liveFor(databaseId: string) {
    return liveConnections.find((c) => c.savedDatabaseId === databaseId);
  }

  function toggleServer(id: string) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="sidebar" style={width ? { width } : undefined}>
      <div className="sidebar-header">
        <h1>NeuroDB</h1>
        <p className="tagline">AI-Powered PostgreSQL</p>
      </div>

      <div className="connections-section">
        <div className="section-header">
          <h3>Connections</h3>
          <button className="btn-icon" title="Add Connection" onClick={() => setModalOpen(true)}>
            <Plus size={16} />
          </button>
        </div>

        <div className="server-list">
          {servers.length === 0 && liveConnections.length === 0 && (
            <div className="no-connections">No connections</div>
          )}

          {servers.map((server) => {
            const isCollapsed = collapsed[server.id];
            return (
              <div key={server.id} className="server-group">
                <div className="server-row">
                  <button
                    className="server-toggle"
                    onClick={() => toggleServer(server.id)}
                    title={isCollapsed ? "Expand" : "Collapse"}
                  >
                    <ChevronRight size={13} className={`chevron ${isCollapsed ? "" : "open"}`} />
                    <Server size={13} />
                    <span className="server-name" title={`${server.databaseUser}@${server.host}:${server.port}`}>
                      {server.name}
                    </span>
                    <span className="server-count">{server.databases.length}</span>
                  </button>
                  <div className="server-actions">
                    <button
                      className="btn-icon"
                      title="Add databases"
                      onClick={() => setAddDbServer(server)}
                    >
                      <Plus size={13} />
                    </button>
                    <button
                      className="btn-icon-danger"
                      title="Delete server and its databases"
                      onClick={() => {
                        if (confirm(`Delete server "${server.name}" and all its databases?`))
                          deleteServer(server.id);
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="database-list">
                    {server.databases.length === 0 && (
                      <div className="database-empty">
                        No databases —{" "}
                        <button className="link-btn" onClick={() => setAddDbServer(server)}>
                          add one
                        </button>
                      </div>
                    )}
                    {server.databases.map((db) => {
                      const live = liveFor(db.id);
                      const isActive = live && activeConnectionId === live.id;
                      return (
                        <div
                          key={db.id}
                          className={`database-item ${isActive ? "active" : ""}`}
                        >
                          <span className={`connection-status-dot ${live ? "connected" : ""}`} />
                          <Database size={13} />
                          <span
                            className="database-name"
                            title={db.name}
                            onClick={async () => {
                              onSelectTable(null);
                              if (live) setActiveConnectionId(live.id);
                              else await activateDatabase(db.id);
                            }}
                          >
                            {db.name}
                          </span>
                          <div className="database-actions">
                            {live && (
                              <button
                                className="btn-icon"
                                title="Disconnect"
                                onClick={() => disconnect(live.id)}
                              >
                                <X size={13} />
                              </button>
                            )}
                            <button
                              className="btn-icon-danger"
                              title="Remove database from server"
                              onClick={() => {
                                if (confirm(`Remove "${db.name}" from "${server.name}"?`))
                                  removeDatabase(server.id, db.id);
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Ad-hoc live connections with no saved database record (e.g. legacy) */}
          {liveConnections
            .filter((c) => !c.savedDatabaseId)
            .map((c) => (
              <div key={c.id} className="server-group">
                <div
                  className={`database-item standalone ${activeConnectionId === c.id ? "active" : ""}`}
                >
                  <span className="connection-status-dot connected" />
                  <Database size={13} />
                  <span
                    className="database-name"
                    title={c.name}
                    onClick={() => {
                      onSelectTable(null);
                      setActiveConnectionId(c.id);
                    }}
                  >
                    {c.name}
                  </span>
                  <div className="database-actions">
                    <button className="btn-icon" title="Disconnect" onClick={() => disconnect(c.id)}>
                      <X size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {modalOpen && <ConnectionModal onClose={() => setModalOpen(false)} />}
      {addDbServer && (
        <AddDatabaseModal server={addDbServer} onClose={() => setAddDbServer(null)} />
      )}
    </div>
  );
}
