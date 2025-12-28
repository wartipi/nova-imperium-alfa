import { sql, SQL } from "drizzle-orm";
import { PgColumn } from "drizzle-orm/pg-core";

export function jsonbContains(column: PgColumn, value: unknown): SQL {
  return sql`${column}::jsonb @> ${JSON.stringify(value)}::jsonb`;
}

export function jsonbContainsArray(column: PgColumn, arrayItem: string | number): SQL {
  return sql`${column}::jsonb @> ${JSON.stringify([arrayItem])}::jsonb`;
}

export function jsonbContainsObject(column: PgColumn, obj: Record<string, unknown>): SQL {
  return sql`${column}::jsonb @> ${JSON.stringify(obj)}::jsonb`;
}

export function jsonbArrayHasAny(column: PgColumn, values: (string | number)[]): SQL[] {
  return values.map(value => jsonbContainsArray(column, value));
}

export function jsonbExtractText(column: PgColumn, key: string): SQL {
  return sql`${column}->>'${sql.raw(key)}'`;
}

export function jsonbExtractNumber(column: PgColumn, key: string): SQL {
  return sql`(${column}->>'${sql.raw(key)}')::float`;
}
