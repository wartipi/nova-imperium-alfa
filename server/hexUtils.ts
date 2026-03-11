function offsetToCube(col: number, row: number): { x: number; y: number; z: number } {
  const x = col;
  const z = row - (col - (col & 1)) / 2;
  const y = -x - z;
  return { x, y, z };
}

export function hexDistance(x1: number, y1: number, x2: number, y2: number): number {
  const c1 = offsetToCube(x1, y1);
  const c2 = offsetToCube(x2, y2);
  return (Math.abs(c1.x - c2.x) + Math.abs(c1.y - c2.y) + Math.abs(c1.z - c2.z)) / 2;
}
