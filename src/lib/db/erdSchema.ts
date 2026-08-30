import { Pool } from "pg";
import { ERD_SCHEMA_QUERY, ERD_FOREIGN_KEYS_QUERY } from "./queries";
import { ErdSchema, ErdTable } from "@/types";

export async function fetchErdSchema(pool: Pool, schemaName: string): Promise<ErdSchema> {
  const [colsResult, fksResult] = await Promise.all([
    pool.query(ERD_SCHEMA_QUERY, [schemaName]),
    pool.query(ERD_FOREIGN_KEYS_QUERY, [schemaName]),
  ]);

  const tablesByName = new Map<string, ErdTable>();
  for (const row of colsResult.rows as {
    schema: string;
    table_name: string;
    column_name: string;
    data_type: string;
    udt_name: string;
    nullable: "YES" | "NO";
    is_primary_key: boolean;
  }[]) {
    let table = tablesByName.get(row.table_name);
    if (!table) {
      table = { schema: row.schema, name: row.table_name, columns: [] };
      tablesByName.set(row.table_name, table);
    }
    table.columns.push({
      name: row.column_name,
      dataType: row.data_type,
      udtName: row.udt_name,
      nullable: row.nullable === "YES",
      isPrimaryKey: row.is_primary_key,
    });
  }

  return {
    tables: Array.from(tablesByName.values()),
    edges: (fksResult.rows as {
      constraint_name: string;
      source_table: string;
      source_column: string;
      target_table: string;
      target_column: string;
    }[]).map((row) => ({
      constraintName: row.constraint_name,
      sourceTable: row.source_table,
      sourceColumn: row.source_column,
      targetTable: row.target_table,
      targetColumn: row.target_column,
    })),
  };
}
