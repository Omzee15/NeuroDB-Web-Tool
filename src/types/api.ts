export interface SavedDatabaseRecord {
  id: string;
  name: string;
  createdAt: string;
}

export interface SavedServerRecord {
  id: string;
  name: string;
  host: string;
  port: number;
  databaseUser: string;
  ssl: boolean;
  connectionString: string | null;
  createdAt: string;
  databases: SavedDatabaseRecord[];
}

export interface LiveConnection {
  id: string;
  name: string;
  /** the SavedDatabase this live pool was opened from, if any */
  savedDatabaseId?: string;
}

export interface SchemaTreeEntry {
  schema: string;
  name: string;
  type: "table" | "view";
}

export interface SchemaTree {
  schemas: string[];
  tree: Record<string, { tables: SchemaTreeEntry[]; views: SchemaTreeEntry[] }>;
}

export interface ColumnInfo {
  name: string;
  type: string;
  udt_name: string;
  nullable: "YES" | "NO";
  default_value: string | null;
  max_length: number | null;
  is_primary_key: boolean;
}

export interface QueryResultData {
  success: true;
  rows: Record<string, unknown>[];
  fields: string[];
  rowCount: number;
  executionTimeMs: number;
  command: string;
}

export interface QueryResultError {
  success: false;
  error: string;
}
