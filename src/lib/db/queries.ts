export const SCHEMAS_QUERY = `
  SELECT schema_name
  FROM information_schema.schemata
  WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    AND schema_name NOT LIKE 'pg_temp_%'
    AND schema_name NOT LIKE 'pg_toast_temp_%'
  ORDER BY CASE WHEN schema_name = 'public' THEN 0 ELSE 1 END, schema_name;
`;

export const TABLES_AND_VIEWS_QUERY = `
  SELECT
    t.table_schema AS schema,
    t.table_name AS name,
    t.table_type AS type
  FROM information_schema.tables t
  WHERE t.table_schema = $1
  ORDER BY t.table_name;
`;

export const COLUMNS_QUERY = `
  SELECT
    c.column_name AS name,
    c.data_type AS type,
    c.udt_name AS udt_name,
    c.is_nullable AS nullable,
    c.column_default AS default_value,
    c.character_maximum_length AS max_length,
    (
      SELECT true FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = c.table_schema
        AND tc.table_name = c.table_name
        AND kcu.column_name = c.column_name
      LIMIT 1
    ) AS is_primary_key
  FROM information_schema.columns c
  WHERE c.table_schema = $1 AND c.table_name = $2
  ORDER BY c.ordinal_position;
`;

// Full ERD-ready schema graph: every table's columns, PK flags, and every FK edge in one pass.
export const ERD_SCHEMA_QUERY = `
  WITH pk_cols AS (
    SELECT tc.table_schema, tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
  )
  SELECT
    c.table_schema AS schema,
    c.table_name AS table_name,
    c.column_name AS column_name,
    c.data_type AS data_type,
    c.udt_name AS udt_name,
    c.is_nullable AS nullable,
    c.ordinal_position AS ordinal_position,
    (pk.column_name IS NOT NULL) AS is_primary_key
  FROM information_schema.columns c
  LEFT JOIN pk_cols pk
    ON pk.table_schema = c.table_schema AND pk.table_name = c.table_name AND pk.column_name = c.column_name
  WHERE c.table_schema = $1
  ORDER BY c.table_name, c.ordinal_position;
`;

export const ERD_FOREIGN_KEYS_QUERY = `
  SELECT
    tc.constraint_name AS constraint_name,
    tc.table_schema AS source_schema,
    tc.table_name AS source_table,
    kcu.column_name AS source_column,
    ccu.table_schema AS target_schema,
    ccu.table_name AS target_table,
    ccu.column_name AS target_column
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = $1
  ORDER BY tc.table_name;
`;

export function quoteIdentifierIfNeeded(identifier: string): string {
  if (/^[a-z_][a-z0-9_]*$/.test(identifier) && !RESERVED_WORDS.has(identifier.toUpperCase())) {
    return identifier;
  }
  return `"${identifier.replace(/"/g, '""')}"`;
}

const RESERVED_WORDS = new Set([
  "SELECT", "FROM", "WHERE", "TABLE", "ORDER", "GROUP", "USER", "COLUMN",
  "PRIMARY", "FOREIGN", "KEY", "INDEX", "VIEW", "DEFAULT", "NULL", "CHECK",
]);
