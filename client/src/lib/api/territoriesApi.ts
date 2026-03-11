function getAuthToken(): string | null {
  try {
    const saved = localStorage.getItem("nova_imperium_auth");
    if (!saved) return null;
    const { token } = JSON.parse(saved);
    return token ?? null;
  } catch {
    return null;
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export interface TerritoryDTO {
  id: number;
  worldX: number;
  worldY: number;
  playerId: string;
  playerName: string;
  factionId: number;
  factionName: string;
  claimedAt: string;
}

export interface ColonyDTO {
  id: number;
  name: string;
  worldX: number;
  worldY: number;
  founderId: string;
  founderName: string;
  factionId: number;
  factionName: string;
  foundedAt: string;
  isCapital: boolean;
}

export async function fetchAllTerritories(): Promise<TerritoryDTO[]> {
  const res = await fetch("/api/territories");
  if (!res.ok) throw new Error("Erreur chargement territoires");
  return res.json();
}

export async function fetchAllColonies(): Promise<ColonyDTO[]> {
  const res = await fetch("/api/territories/colonies");
  if (!res.ok) throw new Error("Erreur chargement colonies");
  return res.json();
}

export async function apiClaimTerritory(worldX: number, worldY: number): Promise<TerritoryDTO> {
  const res = await fetch("/api/territories/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ worldX, worldY }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erreur revendication territoire");
  }
  return res.json();
}

export async function apiFoundColony(worldX: number, worldY: number, name: string): Promise<ColonyDTO> {
  const res = await fetch("/api/territories/colonies/found", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ worldX, worldY, name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erreur fondation colonie");
  }
  return res.json();
}
