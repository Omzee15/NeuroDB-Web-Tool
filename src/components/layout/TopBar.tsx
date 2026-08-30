"use client";

import { X } from "lucide-react";
import { useConnections } from "@/contexts/ConnectionContext";

export function TopBar() {
  const { liveConnections, activeConnectionId, setActiveConnectionId, disconnect } = useConnections();

  return (
    <div className="top-bar">
      <div className="connection-tabs-section">
        <div className="connection-tabs-container">
          {liveConnections.length === 0 ? (
            <div className="no-connections">No connections</div>
          ) : (
            liveConnections.map((c) => (
              <div
                key={c.id}
                className={`connection-tab ${activeConnectionId === c.id ? "active" : ""}`}
                onClick={() => setActiveConnectionId(c.id)}
              >
                <span className="connection-status-dot connected" />
                {c.name}
                <button
                  className="connection-tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    disconnect(c.id);
                  }}
                >
                  <X size={10} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
