import { ErdSchema } from "@/types";

function needsQuoting(identifier: string): boolean {
  return /[A-Z]/.test(identifier) || /[^a-zA-Z0-9_]/.test(identifier);
}

function label(identifier: string): string {
  return needsQuoting(identifier) ? `${identifier} [REQUIRES QUOTES]` : identifier;
}

// Renders the introspected schema into the grouped, human-readable text the AI prompt expects.
export function formatSchemaForPrompt(schema: ErdSchema): string {
  if (schema.tables.length === 0) {
    return "No tables found in the current schema.";
  }

  const bySchema = new Map<string, typeof schema.tables>();
  for (const table of schema.tables) {
    const list = bySchema.get(table.schema) ?? [];
    list.push(table);
    bySchema.set(table.schema, list);
  }

  const edgesByTable = new Map<string, ErdSchema["edges"]>();
  for (const edge of schema.edges) {
    const list = edgesByTable.get(edge.sourceTable) ?? [];
    list.push(edge);
    edgesByTable.set(edge.sourceTable, list);
  }

  const lines: string[] = [];
  for (const [schemaName, tables] of bySchema) {
    lines.push(`Schema: ${label(schemaName)}`);
    for (const table of tables) {
      lines.push(`  Table: ${label(table.name)}`);
      for (const col of table.columns) {
        const parts = [`${label(col.name)} (${col.dataType})`];
        if (col.isPrimaryKey) parts.push("PRIMARY KEY");
        if (!col.nullable) parts.push("NOT NULL");
        const fk = edgesByTable.get(table.name)?.find((e) => e.sourceColumn === col.name);
        if (fk) parts.push(`FOREIGN KEY -> ${label(fk.targetTable)}.${label(fk.targetColumn)}`);
        lines.push(`    - ${parts.join(", ")}`);
      }
    }
  }
  return lines.join("\n");
}
