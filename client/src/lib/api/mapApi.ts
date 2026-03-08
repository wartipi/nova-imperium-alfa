export interface DbTile {
  id: number;
  segmentId: number;
  localX: number;
  localY: number;
  worldX: number;
  worldY: number;
  terrainType: string;
  resourceType: string | null;
  elevation: number | null;
  isWalkable: boolean;
  movementCost: number;
  metadata: unknown;
}

export interface DbSegment {
  id: number;
  segmentX: number;
  segmentY: number;
  width: number;
  height: number;
  name: string | null;
  isActive: boolean;
}

export interface SegmentBlock {
  centerX: number;
  centerY: number;
  segmentCount: number;
  totalTiles: number;
  segments: Array<{ segment: DbSegment; tiles: DbTile[] }>;
}

export async function fetchMapBlock(centerSegX: number, centerSegY: number): Promise<SegmentBlock> {
  const res = await fetch(`/api/map/block/${centerSegX}/${centerSegY}`);
  if (!res.ok) {
    throw new Error(`Erreur chargement bloc carte: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchSegmentTiles(segmentX: number, segmentY: number): Promise<DbTile[]> {
  const res = await fetch(`/api/map/segment/${segmentX}/${segmentY}/tiles`);
  if (!res.ok) {
    throw new Error(`Erreur chargement tuiles segment: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.tiles;
}

export async function fetchMapStats(): Promise<{ segments: number; tiles: number }> {
  const res = await fetch("/api/map/stats");
  if (!res.ok) {
    throw new Error(`Erreur chargement stats carte: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
