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
  buildingLevels?:   Record<string, number>; // V3-D7-B : niveau par bâtiment (ex. barracks: 1–4)
  currentProduction: CityProductionDTO | null;
  // Phase 8 : économie calculée serveur (base + bonus bâtiments)
  foodPerTurn:       number;
  productionPerTurn: number;
  // Bloc B V2 : fracten par tour (palace/market/courthouse)
  fractenPerTurn:    number;
  // Phase 11 — Ownership canonique
  ownerType:        string;
  ownerPlayerId:    string | null;
  ownerPlayerName:  string | null;
  ownerFactionId:   number | null;
  ownerFactionName: string | null;
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

// Démarre une construction avec validation et déduction city_inventory côté serveur.
// Admin : construction instantanée. Joueur : mise en file + débit inventaire.
export interface StartConstructionResult {
  ok:       boolean;
  mode:     'instant' | 'queued';
  building: string;
  deducted?: {
    // V2 — F1
    fracten: number; food: number; wood: number; stone: number;
    common_metals: number; coal: number; oil: number; herbs: number;
    leather_fur: number;
  };
}

export async function apiStartConstruction(
  cityId:           string,
  building:         string,
  fractenCost:      number,           // F1 V2 — remplace goldCost
  foodCost:         number,
  constructionTime: number,
  woodCost          = 0,
  stoneCost         = 0,
  commonMetalsCost  = 0,              // F1 V2 — remplace ironCost
  _copperCostUnused = 0,              // V1 ignoré — fusionné dans commonMetalsCost côté serveur
  coalCost          = 0,
  oilCost           = 0,
  herbsCost         = 0,
  leatherFurCost    = 0,              // F1 V2 — remplace furCost
): Promise<StartConstructionResult> {
  const res = await fetch(`/api/cities/${cityId}/start-construction`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body:    JSON.stringify({ building, fractenCost, foodCost, woodCost, stoneCost, commonMetalsCost, coalCost, oilCost, herbsCost, leatherFurCost, constructionTime }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error ?? `apiStartConstruction: HTTP ${res.status}`), { body });
  }
  return res.json();
}

// Supprime la production courante (après complétion ou annulation).
export async function apiClearProduction(cityId: string): Promise<void> {
  const res = await fetch(`/api/cities/${cityId}/production`, {
    method:  "DELETE",
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error(`apiClearProduction: HTTP ${res.status}`);
}

// ─── V3-D5-D : recrutement serveur-authoritative ─────────────────────────────
// Fonctions API du recrutement serveur-authoritative utilisées par RecruitmentPanel depuis V3-D5-E/G.

type RecruitmentCostResource =
  | "food"
  | "wood"
  | "stone"
  | "common_metals"
  | "common_textiles"
  | "labor_contracts"
  | "basic_equipment";

type RecruitmentResourceCost = Partial<Record<RecruitmentCostResource, number>>;

export interface RecruitmentMissingResource {
  resource:  RecruitmentCostResource;
  required:  number;
  available: number;
  shortage:  number;
}

export interface StartRecruitmentSuccess {
  ok:       true;
  cityId:   number;
  unitType: string;
  production: {
    type:     "unit";
    name:     string;
    cost:     number;
    progress: number;
  };
  debited: RecruitmentResourceCost;
}

export interface RuntimeRecruitmentCostEntry {
  duration: number;
  cost: RecruitmentResourceCost;
}

export interface RecruitmentCostsResponse {
  ok: true;
  costs: Record<string, RuntimeRecruitmentCostEntry>;
}

/**
 * Charge les coûts de recrutement depuis le catalogue serveur (RUNTIME_RECRUITMENT_COSTS).
 * GET /api/cities/recruitment-costs
 * Retourne uniquement les unités supportées par UNIT_CATALOG côté serveur.
 */
export async function apiGetRecruitmentCosts(): Promise<RecruitmentCostsResponse> {
  const res = await fetch("/api/cities/recruitment-costs", {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(
      new Error(body.error ?? `apiGetRecruitmentCosts: HTTP ${res.status}`),
      { body },
    );
  }
  return res.json();
}

/**
 * Démarre le recrutement d'une unité via la route serveur-authoritative.
 *
 * POST /api/cities/:cityId/start-recruitment
 * Body : { unitType }
 *
 * Erreurs connues (attachées à l'Error via Object.assign) :
 *   400 unitType absent/inconnu         → body.error = "unitType inconnu…"
 *   400 INSUFFICIENT_CITY_INVENTORY     → body.error, body.missing[]
 *   409 PRODUCTION_ALREADY_ACTIVE       → body.error, body.message
 *   500 erreur inattendue               → body vide ou message générique
 *
 * UI non branchée — ne pas appeler depuis RecruitmentPanel.tsx avant V3-D5-D.
 */
export async function apiStartRecruitment(
  cityId:   number,
  unitType: string,
): Promise<StartRecruitmentSuccess> {
  const res = await fetch(`/api/cities/${cityId}/start-recruitment`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body:    JSON.stringify({ unitType }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(
      new Error(body.error ?? `apiStartRecruitment: HTTP ${res.status}`),
      { body },
    );
  }
  return res.json();
}

// ─── Tick de production serveur-authoritatif ──────────────────────────────────
// Avance la file de production de toutes les villes du joueur côté serveur.
// Retourne le résumé des complétions pour que l'UI affiche les toasts.
export interface CityProductionTickResult {
  applied: boolean;
  progressed: number[];
  completedBuildings: { cityId: number; cityName: string; buildingId: string }[];
  completedUnits: { cityId: number; cityName: string; unitId: number; unitType: string; unitName: string }[];
}

// ─── PATCH /api/cities/:cityId/display-name ───────────────────────────────────
// Administrateur uniquement. Persiste le nom en base.
// Après appel, recharger via hydrateCitiesFromServer() pour que l'UI reflète la DB.
export async function apiRenameCityDisplayName(cityId: number, displayName: string): Promise<void> {
  const res = await fetch(`/api/cities/${cityId}/display-name`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ displayName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Erreur renommage ville");
  }
}

export async function apiProductionTick(): Promise<CityProductionTickResult> {
  const res = await fetch("/api/cities/production-tick", {
    method:  "POST",
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error(`apiProductionTick: HTTP ${res.status}`);
  return res.json();
}
