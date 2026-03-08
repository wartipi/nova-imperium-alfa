import { eq, and, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import { mapSegments, mapTiles, type MapSegment, type MapTile, type InsertMapSegment, type InsertMapTile } from "../shared/schema";
import { getAdjacentSegmentCoords, localToWorld, SEGMENT_WIDTH, SEGMENT_HEIGHT } from "../shared/mapCoordinates";

export async function createSegment(
  segmentX: number,
  segmentY: number,
  width: number = SEGMENT_WIDTH,
  height: number = SEGMENT_HEIGHT,
  name?: string
): Promise<MapSegment> {
  const existing = await getSegment(segmentX, segmentY);
  if (existing) return existing;

  const [segment] = await db
    .insert(mapSegments)
    .values({ segmentX, segmentY, width, height, name: name ?? null, isActive: true })
    .returning();

  return segment;
}

export async function createTilesForSegment(
  segmentId: number,
  tileDefinitions: Omit<InsertMapTile, "segmentId">[]
): Promise<MapTile[]> {
  if (tileDefinitions.length === 0) return [];

  const rows = tileDefinitions.map((t) => ({ ...t, segmentId }));

  const inserted = await db
    .insert(mapTiles)
    .values(rows)
    .onConflictDoNothing()
    .returning();

  return inserted;
}

export async function getSegment(
  segmentX: number,
  segmentY: number
): Promise<MapSegment | null> {
  const [segment] = await db
    .select()
    .from(mapSegments)
    .where(and(eq(mapSegments.segmentX, segmentX), eq(mapSegments.segmentY, segmentY)))
    .limit(1);

  return segment ?? null;
}

export async function getTilesForSegment(
  segmentX: number,
  segmentY: number
): Promise<MapTile[]> {
  const segment = await getSegment(segmentX, segmentY);
  if (!segment) return [];

  return db
    .select()
    .from(mapTiles)
    .where(eq(mapTiles.segmentId, segment.id));
}

export async function getSegmentWithTiles(
  segmentX: number,
  segmentY: number
): Promise<{ segment: MapSegment; tiles: MapTile[] } | null> {
  const segment = await getSegment(segmentX, segmentY);
  if (!segment) return null;

  const tiles = await db
    .select()
    .from(mapTiles)
    .where(eq(mapTiles.segmentId, segment.id));

  return { segment, tiles };
}

export async function getNineSegmentBlock(
  centerSegmentX: number,
  centerSegmentY: number
): Promise<{ segment: MapSegment; tiles: MapTile[] }[]> {
  const coords = getAdjacentSegmentCoords(centerSegmentX, centerSegmentY);

  const xValues = Array.from(new Set(coords.map((c) => c.segmentX)));
  const yValues = Array.from(new Set(coords.map((c) => c.segmentY)));

  const allCandidates = await db
    .select()
    .from(mapSegments)
    .where(
      and(
        inArray(mapSegments.segmentX, xValues),
        inArray(mapSegments.segmentY, yValues)
      )
    );

  const coordSet = new Set(coords.map((c) => `${c.segmentX},${c.segmentY}`));
  const segments = allCandidates.filter((s) => coordSet.has(`${s.segmentX},${s.segmentY}`));

  if (segments.length === 0) return [];

  const segmentIds = segments.map((s) => s.id);
  const tiles = await db
    .select()
    .from(mapTiles)
    .where(inArray(mapTiles.segmentId, segmentIds));

  const tilesBySegment = new Map<number, MapTile[]>();
  for (const tile of tiles) {
    const list = tilesBySegment.get(tile.segmentId) ?? [];
    list.push(tile);
    tilesBySegment.set(tile.segmentId, list);
  }

  return segments.map((segment) => ({
    segment,
    tiles: tilesBySegment.get(segment.id) ?? [],
  }));
}

export async function getSegmentCount(): Promise<number> {
  const result = await db.select({ count: sql<number>`count(*)` }).from(mapSegments);
  return Number(result[0].count);
}

export async function getTileCount(): Promise<number> {
  const result = await db.select({ count: sql<number>`count(*)` }).from(mapTiles);
  return Number(result[0].count);
}
