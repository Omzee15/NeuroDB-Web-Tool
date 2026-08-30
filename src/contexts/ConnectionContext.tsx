"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { SavedServerRecord, LiveConnection, SchemaTree } from "@/types/api";

interface NewServerInput {
  name: string;
  host: string;
  port: number;
  user: string;
  password: string;
  ssl: boolean;
  connectionString?: string;
  /** databases to register under the new server */
  databases: string[];
}

interface ConnectionContextValue {
  servers: SavedServerRecord[];
  liveConnections: LiveConnection[];
  activeConnectionId: string | null;
  schemaTree: SchemaTree | null;
  schemaLoading: boolean;
  setActiveConnectionId: (id: string | null) => void;
  refreshServers: () => Promise<void>;
  /** create a saved server + its databases */
  createServer: (input: NewServerInput) => Promise<{ error?: string; id?: string }>;
  /** add more databases to an existing saved server */
  addDatabases: (serverId: string, databases: string[]) => Promise<{ error?: string }>;
  /** remove one database from a saved server */
  removeDatabase: (serverId: string, databaseId: string) => Promise<void>;
  /** open a live pool for a registered database */
  activateDatabase: (databaseId: string) => Promise<{ error?: string; id?: string }>;
  disconnect: (connectionId: string) => Promise<void>;
  deleteServer: (serverId: string) => Promise<void>;
  refreshSchema: () => Promise<void>;
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [servers, setServers] = useState<SavedServerRecord[]>([]);
  const [liveConnections, setLiveConnections] = useState<LiveConnection[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [schemaTree, setSchemaTree] = useState<SchemaTree | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);

  const refreshServers = useCallback(async () => {
    const res = await fetch("/api/servers");
    if (!res.ok) return;
    const data = await res.json();
    setServers(data.servers);
  }, []);

  useEffect(() => {
    refreshServers();
  }, [refreshServers]);

  const refreshSchema = useCallback(async () => {
    if (!activeConnectionId) {
      setSchemaTree(null);
      return;
    }
    setSchemaLoading(true);
    try {
      const res = await fetch(`/api/schema?connectionId=${activeConnectionId}`);
      if (!res.ok) {
        setSchemaTree(null);
        return;
      }
      const data = await res.json();
      setSchemaTree(data);
    } finally {
      setSchemaLoading(false);
    }
  }, [activeConnectionId]);

  useEffect(() => {
    refreshSchema();
  }, [refreshSchema]);

  const createServer = useCallback(
    async (input: NewServerInput) => {
      const res = await fetch("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Failed to save server" };
      await refreshServers();
      return { id: data.server.id };
    },
    [refreshServers]
  );

  const addDatabases = useCallback(
    async (serverId: string, databases: string[]) => {
      const res = await fetch(`/api/servers/${serverId}/databases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databases }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { error: data.error || "Failed to add databases" };
      await refreshServers();
      return {};
    },
    [refreshServers]
  );

  const removeDatabase = useCallback(
    async (serverId: string, databaseId: string) => {
      await fetch(`/api/servers/${serverId}/databases?databaseId=${databaseId}`, {
        method: "DELETE",
      });
      // Drop any live connection opened from this database.
      setLiveConnections((prev) => prev.filter((c) => c.savedDatabaseId !== databaseId));
      await refreshServers();
    },
    [refreshServers]
  );

  const activateDatabase = useCallback(
    async (databaseId: string) => {
      const existing = liveConnections.find((c) => c.savedDatabaseId === databaseId);
      if (existing) {
        setActiveConnectionId(existing.id);
        return { id: existing.id };
      }

      const res = await fetch("/api/connect/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Failed to connect" };

      let label = "Connection";
      for (const s of servers) {
        const db = s.databases.find((d) => d.id === databaseId);
        if (db) {
          label = `${s.name} / ${db.name}`;
          break;
        }
      }

      setLiveConnections((prev) => [...prev, { id: data.id, name: label, savedDatabaseId: databaseId }]);
      setActiveConnectionId(data.id);
      return { id: data.id };
    },
    [liveConnections, servers]
  );

  const disconnect = useCallback(
    async (connectionId: string) => {
      await fetch(`/api/connect?id=${connectionId}`, { method: "DELETE" });
      setLiveConnections((prev) => prev.filter((c) => c.id !== connectionId));
      if (activeConnectionId === connectionId) {
        const remaining = liveConnections.filter((c) => c.id !== connectionId);
        setActiveConnectionId(remaining[0]?.id ?? null);
      }
    },
    [activeConnectionId, liveConnections]
  );

  const deleteServer = useCallback(
    async (serverId: string) => {
      const server = servers.find((s) => s.id === serverId);
      const dbIds = new Set(server?.databases.map((d) => d.id) ?? []);
      await fetch(`/api/servers?id=${serverId}`, { method: "DELETE" });
      setLiveConnections((prev) => prev.filter((c) => !c.savedDatabaseId || !dbIds.has(c.savedDatabaseId)));
      await refreshServers();
    },
    [servers, refreshServers]
  );

  return (
    <ConnectionContext.Provider
      value={{
        servers,
        liveConnections,
        activeConnectionId,
        schemaTree,
        schemaLoading,
        setActiveConnectionId,
        refreshServers,
        createServer,
        addDatabases,
        removeDatabase,
        activateDatabase,
        disconnect,
        deleteServer,
        refreshSchema,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnections(): ConnectionContextValue {
  const ctx = useContext(ConnectionContext);
  if (!ctx) throw new Error("useConnections must be used within ConnectionProvider");
  return ctx;
}
