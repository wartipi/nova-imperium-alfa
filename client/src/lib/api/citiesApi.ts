function getAuthHeaders(): Record<string, string> {
  const saved = localStorage.getItem("nova_imperium_auth");
  if (!saved) return {};
  const { token } = JSON.parse(saved);
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export interface CityProductionDTO {
  type:     string;
  name:     string;
  cost:     number;
  progress: number;
}

export interface CityDTO {
  id:       number;   // cities.id — PK (correction Phase 7 : était colonyId en Phase 6)
  colonyId: number;   // colonies.id — champ distinct depuis Phase 7
  name:             string;
  displayName:      string | null;
  population:       number;
  worldX:           number;
  worldY:           number;
  factionId:        number;
  factionName:      string;
  founderName:      string;
  createdAt:        string;
  buildings:         string[];
  currentProduction: CityProductionDTO | null;
  // Phase 8 : économie calculée serveur (base + bonus bâtiments)
  foodPerTurn:       number;
  productionPerTurn: number;
}

// ─── Lecture ──────────────────────────────────────────────────────────────────

export async function fetchMyCities(): Promise<CityDTO[]> {
  const res = await fetch("/api/cities/me", {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error(`fetchMyCities: HTTP ${res.status}`);
  return res.json();
}

// ─── Phase 7 : écriture bâtiments et production ───────────────────────────────

// Enregistre un bâtiment terminé dans city_buildings (idempotent côté DB).
export async function apiAddBuilding(cityId: string, building: string): Promise<void> {
  const res = await fetch(`/api/cities/${cityId}/buildings`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body:    JSON.stringify({ building }),
  });
  if (!res.ok) throw new Error(`apiAddBuilding: HTTP ${res.status}`);
}

// UPSERT de la production courante (démarrage, progression, changement).
export async function apiSetProduction(
  cityId: string,
  data:   { type: string; name: string; cost: number; progress: number },
): Promise<void> {
  const res = await fetch(`/api/cities/${cityId}/production`, {
    method:  "PUT",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body:    JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`apiSetProduction: HTTP ${res.status}`);
}

// Supprime la production courante (après complétion ou annulation).
export async function apiClearProduction(cityId: string): Promise<void> {
  const res = await fetch(`/api/cities/${cityId}/production`, {
    method:  "DELETE",
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error(`apiClearProduction: HTTP ${res.status}`);
}
