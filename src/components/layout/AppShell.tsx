"use client";

import { useState } from "react";
import { Settings, Sparkles, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useConnections } from "@/contexts/ConnectionContext";
import { AiPanelProvider, useAiPanel } from "@/contexts/AiPanelContext";
import { useResizablePanel } from "@/hooks/useResizablePanel";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { DbTree } from "@/components/sidebar/DbTree";
import { TopBar } from "@/components/layout/TopBar";
import { WelcomeScreen } from "@/components/layout/WelcomeScreen";
import { QueryTab } from "@/components/query/QueryTab";
import { PsqlTab } from "@/components/psql/PsqlTab";
import { ErdTab } from "@/components/erd/ErdTab";
import { AiPanel } from "@/components/ai/AiPanel";
import { SettingsModal } from "@/components/settings/SettingsModal";

export type MainTab = "query" | "psql" | "erd";

export function AppShell() {
  return (
    <AiPanelProvider>
      <AppShellInner />
    </AiPanelProvider>
  );
}

function AppShellInner() {
  const { user, logout } = useAuth();
  const { activeConnectionId } = useConnections();
  const { open: aiPanelOpen, setOpen: setAiPanelOpen } = useAiPanel();
  const [activeTab, setActiveTab] = useState<MainTab>("query");
  const [selectedTable, setSelectedTable] = useState<{ schema: string; name: string; type: "table" | "view" } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const sidebar = useResizablePanel({
    storageKey: "neurodb.sidebarWidth",
    defaultWidth: 250,
    minWidth: 180,
    maxWidth: 500,
    side: "right",
  });
  const dbBrowser = useResizablePanel({
    storageKey: "neurodb.dbBrowserWidth",
    defaultWidth: 250,
    minWidth: 200,
    maxWidth: 600,
    side: "right",
  });

  return (
    <div className="app-container">
      <div className="title-bar">
        <div className="title-bar-content">
          <div className="title-bar-left" />
          <div className="title-bar-center">
            <div className="header-tabs">
              <div className={`header-tab ${activeTab === "query" ? "active" : ""}`} onClick={() => setActiveTab("query")}>
                Query Tool
              </div>
              <div className={`header-tab ${activeTab === "psql" ? "active" : ""}`} onClick={() => setActiveTab("psql")}>
                PSQL
              </div>
              <div className={`header-tab ${activeTab === "erd" ? "active" : ""}`} onClick={() => setActiveTab("erd")}>
                DB Viewer
              </div>
            </div>
          </div>
          <div className="title-bar-right">
            <span className="current-username" title={user?.username}>{user?.username}</span>
            <button className="btn-icon" title="Settings" onClick={() => setSettingsOpen(true)}>
              <Settings size={16} />
            </button>
            <button className="btn-icon" title="Toggle AI Assistant" onClick={() => setAiPanelOpen(!aiPanelOpen)}>
              <Sparkles size={16} />
            </button>
            <button className="btn-icon" title="Log out" onClick={() => logout()}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      <Sidebar onSelectTable={setSelectedTable} width={sidebar.width} />
      <div
        className={`resize-handle-vertical ${sidebar.dragging ? "active" : ""}`}
        title="Drag to resize · double-click to reset"
        {...sidebar.handleProps}
      />

      <div className="main-content">
        <TopBar />
        <div className="content-area">
          {!activeConnectionId ? (
            <WelcomeScreen />
          ) : (
            <div className="database-view">
              <DbTree
                connectionId={activeConnectionId}
                onSelectTable={setSelectedTable}
                width={dbBrowser.width}
              />
              <div
                className={`resize-handle-vertical ${dbBrowser.dragging ? "active" : ""}`}
                title="Drag to resize · double-click to reset"
                {...dbBrowser.handleProps}
              />
              {activeTab === "query" && (
                <QueryTab selectedTable={selectedTable} onClearSelectedTable={() => setSelectedTable(null)} />
              )}
              {activeTab === "psql" && <PsqlTab />}
              {activeTab === "erd" && <ErdTab />}
            </div>
          )}
        </div>
      </div>

      {aiPanelOpen && <AiPanel />}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
