export const SEGMENT_WIDTH = 50;
export const SEGMENT_HEIGHT = 30;

export function worldToSegment(worldX: number, worldY: number): { segmentX: number; segmentY: number } {
  return {
    segmentX: Math.floor(worldX / SEGMENT_WIDTH),
    segmentY: Math.floor(worldY / SEGMENT_HEIGHT),
  };
}

export function worldToLocal(worldX: number, worldY: number): { localX: number; localY: number } {
  return {
    localX: ((worldX % SEGMENT_WIDTH) + SEGMENT_WIDTH) % SEGMENT_WIDTH,
    localY: ((worldY % SEGMENT_HEIGHT) + SEGMENT_HEIGHT) % SEGMENT_HEIGHT,
  };
}

export function localToWorld(
  segmentX: number,
  segmentY: number,
  localX: number,
  localY: number
): { worldX: number; worldY: number } {
  return {
    worldX: segmentX * SEGMENT_WIDTH + localX,
    worldY: segmentY * SEGMENT_HEIGHT + localY,
  };
}

export function getAdjacentSegmentCoords(
  centerX: number,
  centerY: number
): Array<{ segmentX: number; segmentY: number }> {
  return [
    { segmentX: centerX - 1, segmentY: centerY - 1 },
    { segmentX: centerX,     segmentY: centerY - 1 },
    { segmentX: centerX + 1, segmentY: centerY - 1 },
    { segmentX: centerX - 1, segmentY: centerY     },
    { segmentX: centerX,     segmentY: centerY     },
    { segmentX: centerX + 1, segmentY: centerY     },
    { segmentX: centerX - 1, segmentY: centerY + 1 },
    { segmentX: centerX,     segmentY: centerY + 1 },
    { segmentX: centerX + 1, segmentY: centerY + 1 },
  ];
}

export function isValidLocalCoord(localX: number, localY: number): boolean {
  return localX >= 0 && localX < SEGMENT_WIDTH && localY >= 0 && localY < SEGMENT_HEIGHT;
}
