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
  // Historique du claimer — ne sert pas de gate de permission
  playerId: string;
  playerName: string;
  // Legacy seulement
  factionId: number | null;
  factionName: string | null;
  claimedAt: string;
  // Phase 12 — Ownership canonique
  ownerType: 'player' | 'faction';
  ownerPlayerId:   string | null;
  ownerPlayerName: string | null;
  ownerFactionId:  number | null;
  ownerFactionName: string | null;
  // Rattachement V1 — Colonie gestionnaire
  managingColonyId:   number | null;
  managingColonyName: string | null;
  // Exploitation V1 — Colonie exploitante + bâtiment d'exploitation
  exploitingColonyId:       number | null;
  exploitationBuildingType: string | null;
}

export interface ColonyDTO {
  id: number;
  name: string;
  worldX: number;
  worldY: number;
  founderId: string;
  founderName: string;
  factionId: number | null;
  factionName: string | null;
  foundedAt: string;
  isCapital: boolean;
  // Phase 12 — Ownership canonique
  ownerType: 'player' | 'faction';
  ownerPlayerId:   string | null;
  ownerPlayerName: string | null;
  ownerFactionId:  number | null;
  ownerFactionName: string | null;
  // Phase 13 — Gouvernorat
  governorUserId: string | null;
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

export async function apiClaimTerritory(
  worldX: number,
  worldY: number,
  ownerType: 'player' | 'faction' = 'player'
): Promise<TerritoryDTO> {
  const res = await fetch("/api/territories/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ worldX, worldY, ownerType }),
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

// Phase Exploitation V1 — Exploiter un territoire depuis une colonie.
export async function apiExploitTerritory(
  territoryId: number,
  colonyId: number,
  buildingType: string = "exploitation_post",
): Promise<TerritoryDTO> {
  const res = await fetch(`/api/territories/${territoryId}/exploit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ colonyId, buildingType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erreur exploitation territoire");
  }
  return res.json();
}

// Phase 13 — Attribuer un gouverneur (chef de faction uniquement)
export async function apiSetGovernor(colonyId: number, newGovernorUserId: string): Promise<ColonyDTO> {
  const res = await fetch(`/api/territories/colonies/${colonyId}/governor`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ newGovernorUserId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erreur attribution gouverneur");
  }
  return res.json();
}
