/**
 * discoveredTilesApi.ts — Client API pour les tuiles découvertes
 * Coordonnées MONDE en entrée/sortie.
 */

function getAuthToken(): string | null {
  const saved = localStorage.getItem("nova_imperium_auth");
  if (!saved) return null;
  try {
    const { token } = JSON.parse(saved);
    return token ?? null;
  } catch { return null; }
}

function authHeaders(): HeadersInit {
  const token = getAuthToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export interface DiscoveredTile {
  worldX: number;
  worldY: number;
}

/** Charge toutes les tuiles découvertes du joueur courant. */
export async function fetchDiscoveredTiles(): Promise<DiscoveredTile[]> {
  const res = await fetch("/api/player/discovered-tiles", {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`fetchDiscoveredTiles: ${res.status}`);
  const data = await res.json();
  return data.tiles as DiscoveredTile[];
}

/** Persiste par lot les nouvelles tuiles découvertes. */
export async function syncDiscoveredTiles(tiles: DiscoveredTile[]): Promise<void> {
  if (tiles.length === 0) return;
  const res = await fetch("/api/player/discovered-tiles", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ tiles }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[syncDiscoveredTiles] Erreur:", err);
  }
}
