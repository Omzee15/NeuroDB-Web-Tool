export interface ConnectionSummary {
  id: string;
  name: string;
  config: {
    name: string;
    host: string;
    port: number;
    user: string;
    database: string;
    ssl: boolean;
  };
  createdAt: number;
}

export interface TableInfo {
  schema: string;
  name: string;
  type: "table" | "view";
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

export interface QueryResult {
  success: true;
  rows: Record<string, unknown>[];
  fields: string[];
  rowCount: number;
  executionTimeMs: number;
  command: string;
}

export interface QueryError {
  success: false;
  error: string;
  position?: number;
}

export interface FilterRow {
  logic: "AND" | "OR";
  column: string;
  operator: string;
  value: string;
}

export interface ErdColumn {
  name: string;
  dataType: string;
  udtName: string;
  nullable: boolean;
  isPrimaryKey: boolean;
}

export interface ErdTable {
  schema: string;
  name: string;
  columns: ErdColumn[];
}

export interface ErdEdge {
  constraintName: string;
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
}

export interface ErdSchema {
  tables: ErdTable[];
  edges: ErdEdge[];
}
