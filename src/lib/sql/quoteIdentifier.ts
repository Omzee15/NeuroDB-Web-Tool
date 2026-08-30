export function quoteIdentifierIfNeeded(identifier: string): string {
  if (/^[a-z_][a-z0-9_]*$/.test(identifier)) {
    return identifier;
  }
  return `"${identifier.replace(/"/g, '""')}"`;
}
