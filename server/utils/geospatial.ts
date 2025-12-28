import { sql, and, gte, lte, SQL } from "drizzle-orm";
import { PgColumn } from "drizzle-orm/pg-core";

export interface GeospatialQueryOptions {
  xColumn: PgColumn;
  yColumn: PgColumn;
  targetX: number;
  targetY: number;
  radius: number;
  additionalConditions?: SQL[];
}

export function createBoundingBoxCondition(
  xColumn: PgColumn,
  yColumn: PgColumn,
  centerX: number,
  centerY: number,
  radius: number
): SQL[] {
  return [
    gte(xColumn, centerX - radius),
    lte(xColumn, centerX + radius),
    gte(yColumn, centerY - radius),
    lte(yColumn, centerY + radius)
  ];
}

export function createDistanceCondition(
  xColumn: PgColumn,
  yColumn: PgColumn,
  targetX: number,
  targetY: number,
  maxDistance: number
): SQL {
  return sql`SQRT(POWER(${xColumn} - ${targetX}, 2) + POWER(${yColumn} - ${targetY}, 2)) <= ${maxDistance}`;
}

export function createJsonbLocationDistanceCondition(
  locationColumn: PgColumn,
  targetX: number,
  targetY: number,
  maxDistance: number
): SQL[] {
  return [
    sql`(${locationColumn}->>'x')::float BETWEEN ${targetX - maxDistance} AND ${targetX + maxDistance}`,
    sql`(${locationColumn}->>'y')::float BETWEEN ${targetY - maxDistance} AND ${targetY + maxDistance}`,
    sql`SQRT(POWER((${locationColumn}->>'x')::float - ${targetX}, 2) + POWER((${locationColumn}->>'y')::float - ${targetY}, 2)) <= ${maxDistance}`
  ];
}

export function createOptimizedSpatialQuery(options: GeospatialQueryOptions): SQL {
  const boundingBox = createBoundingBoxCondition(
    options.xColumn,
    options.yColumn,
    options.targetX,
    options.targetY,
    options.radius
  );
  
  const distanceCondition = createDistanceCondition(
    options.xColumn,
    options.yColumn,
    options.targetX,
    options.targetY,
    options.radius
  );
  
  const conditions = [...boundingBox, distanceCondition];
  
  if (options.additionalConditions) {
    conditions.push(...options.additionalConditions);
  }
  
  return and(...conditions) as SQL;
}

export function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

export function orderByDistanceSQL(
  xColumn: PgColumn,
  yColumn: PgColumn,
  targetX: number,
  targetY: number
): SQL {
  return sql`SQRT(POWER(${xColumn} - ${targetX}, 2) + POWER(${yColumn} - ${targetY}, 2))`;
}
