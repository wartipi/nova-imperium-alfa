function getAuthHeaders(): Record<string, string> {
  const saved = localStorage.getItem("nova_imperium_auth");
  if (!saved) return {};
  const { token } = JSON.parse(saved);
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export interface EconomyDTO {
  fracten:           number;
  food:              number;
  lastProcessedTurn: number;
  updatedAt:         string;
  fractenPerTurn:    number;
  foodPerTurn:       number;
}

export interface TickResponseDTO {
  applied: boolean;
  economy: {
    fracten:           number;
    food:              number;
    lastProcessedTurn: number;
    updatedAt:         string;
  };
}

export async function fetchMyEconomy(): Promise<EconomyDTO> {
  const res = await fetch("/api/economy/me", {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`fetchMyEconomy: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/**
 * @deprecated NON UTILISÉ — tick économie faction (gold/food via /api/economy/tick).
 * Le tick actif est postProductionTick → /api/economy/production-tick.
 * Conserver pour ne pas casser les imports potentiels, mais NE PAS appeler.
 */
export async function postEconomyTick(currentTurn: number): Promise<TickResponseDTO> {
  const res = await fetch("/api/economy/tick", {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ currentTurn }),
  });
  if (!res.ok) {
    throw new Error(`postEconomyTick: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ─── Types matériaux Tier 1 (partagé) ────────────────────────────────────────

export interface T1Materials {
  fracten:       number;
  common_metals: number;
  leather_fur:   number;
  food:   number;
  wood:   number;
  stone:  number;
  coal:   number;
  oil:    number;
  herbs:  number;
}

// ─── Production tick par-ville ───────────────────────────────────────────────

export interface ProductionTickResult {
  applied: boolean;
  cities:  Array<T1Materials & { cityId: number; name: string; destination: 'bank' | 'pending' }>;
  reason?: string;
}

export async function postProductionTick(currentTurn: number): Promise<ProductionTickResult> {
  const res = await fetch("/api/economy/production-tick", {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ currentTurn }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`postProductionTick: ${res.status} — ${body.error ?? res.statusText}`);
  }
  return res.json();
}

// ─── Banque joueur ───────────────────────────────────────────────────────────

export interface PlayerBankDTO {
  playerId?:          string;
  fracten:            number;
  common_metals:      number;
  leather_fur:        number;
  food:               number;
  wood:               number;
  stone:              number;
  coal:               number;
  oil:                number;
  herbs:              number;
  lastProductionTurn: number;
  updatedAt:          string;
}

export async function getPlayerBank(): Promise<PlayerBankDTO> {
  const res = await fetch("/api/economy/player-bank/me", {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`getPlayerBank: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ─── Harvest ville ───────────────────────────────────────────────────────────

export interface CityHarvestDTO {
  cityId:    number;
  hasBank:   boolean;
  pending:   T1Materials;
  inventory: T1Materials;
}

export async function getCityHarvest(cityId: number): Promise<CityHarvestDTO> {
  const res = await fetch(`/api/cities/${cityId}/harvest`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`getCityHarvest: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export interface CollectHarvestResult {
  ok:     boolean;
  action: {
    id:              number;
    type:            string;
    status:          string;
    msRemaining:     number;
    expectedEndTime: string;
    pendingFracten:      number;
    pendingCommonMetals: number;
    pendingLeatherFur:   number;
    pendingFood:     number;
    pendingWood:     number;
    pendingStone:    number;
    pendingCoal:     number;
    pendingOil:      number;
    pendingHerbs:    number;
  };
}

// ─── Inventaire de transport joueur ──────────────────────────────────────────

export interface PlayerTransportDTO {
  playerId:      string;
  fracten:       number;
  common_metals: number;
  leather_fur:   number;
  food:      number;
  wood:      number;
  stone:     number;
  coal:      number;
  oil:       number;
  herbs:     number;
  updatedAt: string;
  maxUnits:  number;
  usedUnits: number;
  freeUnits: number;
}

export async function getPlayerTransport(): Promise<PlayerTransportDTO> {
  const res = await fetch("/api/economy/player-transport", {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`getPlayerTransport: ${res.status} ${res.statusText}`);
  return res.json();
}

// ─── Ville courante du joueur (physique) ─────────────────────────────────────

export interface PlayerCurrentCityDTO {
  cityId:   number | null;
  cityName: string | null;
  worldX:   number | null;
  worldY:   number | null;
  reason?:  string;
}

export async function getPlayerCurrentCity(): Promise<PlayerCurrentCityDTO> {
  const res = await fetch("/api/economy/player-current-city", {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`getPlayerCurrentCity: ${res.status} ${res.statusText}`);
  return res.json();
}

// ─── Dépôt transport → inventaire ville ──────────────────────────────────────

export interface T1Mats {
  fracten?:       number;
  common_metals?: number;
  leather_fur?:   number;
  food?:   number;
  wood?:   number;
  stone?:  number;
  coal?:   number;
  oil?:    number;
  herbs?:  number;
}

export interface DepositResult {
  ok:        boolean;
  cityId:    number;
  cityName:  string;
  deposited: Required<T1Mats>;
}

export async function postDepositTransportToCity(mats: T1Mats): Promise<DepositResult> {
  const res = await fetch("/api/economy/deposit-transport-to-city", {
    method:  "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body:    JSON.stringify(mats),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? `deposit-transport-to-city: ${res.status}`);
  }
  return res.json();
}

// ─── Dépôt transport → banque joueur ─────────────────────────────────────────

export interface DepositToBankResult {
  ok:          boolean;
  deposited:   Required<T1Mats>;
  destination: "player_bank";
}

export async function postDepositTransportToBank(mats: T1Mats): Promise<DepositToBankResult> {
  const res = await fetch("/api/economy/deposit-transport-to-bank", {
    method:  "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body:    JSON.stringify(mats),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? `deposit-transport-to-bank: ${res.status}`);
  }
  return res.json();
}

// ─── Transferts depuis la banque ──────────────────────────────────────────────

export interface TransferResult {
  ok: boolean;
  action: {
    id:               number;
    type:             string;
    status:           "in_progress" | "completed" | "cancelled";
    msRemaining:      number;
    minRemaining:     number;
    startWorldX:      number;
    startWorldY:      number;
    endWorldX:        number;
    endWorldY:        number;
    totalCost:        number;
    startTime:        string;
    expectedEndTime:  string;
    completedAt:      string | null;
    path:             any[];
    lastAppliedStep:  number | null;
    effectiveStep:    number;
    effectiveWorldX:  number;
    effectiveWorldY:  number;
    effectiveTerrain: string;
    fracten:       number;
    food:          number;
    wood:          number;
    stone:         number;
    common_metals: number;
    coal:          number;
    oil:           number;
    herbs:         number;
    leather_fur:   number;
  };
}

export interface TransferMaterials {
  fracten?:       number;
  common_metals?: number;
  leather_fur?:   number;
  food?:          number;
  wood?:          number;
  stone?:         number;
  coal?:          number;
  oil?:           number;
  herbs?:         number;
}

export async function postTransferBankToCity(
  cityId:           number,
  materials:        TransferMaterials,
  adminModeEnabled?: boolean,
): Promise<TransferResult> {
  const res = await fetch("/api/economy/transfer-bank-to-city", {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      cityId,
      fracten:       materials.fracten       ?? 0,
      common_metals: materials.common_metals ?? 0,
      leather_fur:   materials.leather_fur   ?? 0,
      food:          materials.food          ?? 0,
      wood:          materials.wood          ?? 0,
      stone:         materials.stone         ?? 0,
      coal:          materials.coal          ?? 0,
      oil:           materials.oil           ?? 0,
      herbs:         materials.herbs         ?? 0,
      adminModeEnabled: adminModeEnabled ?? false,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `postTransferBankToCity: ${res.status}`);
  }
  return res.json();
}

export async function postTransferBankToPlayer(
  materials:        TransferMaterials,
  adminModeEnabled?: boolean,
): Promise<TransferResult> {
  const res = await fetch("/api/economy/transfer-bank-to-player", {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      fracten:       materials.fracten       ?? 0,
      common_metals: materials.common_metals ?? 0,
      leather_fur:   materials.leather_fur   ?? 0,
      food:          materials.food          ?? 0,
      wood:          materials.wood          ?? 0,
      stone:         materials.stone         ?? 0,
      coal:          materials.coal          ?? 0,
      oil:           materials.oil           ?? 0,
      herbs:         materials.herbs         ?? 0,
      adminModeEnabled: adminModeEnabled ?? false,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `postTransferBankToPlayer: ${res.status}`);
  }
  return res.json();
}

// ─── Inventaire ville ─────────────────────────────────────────────────────────

export interface CityInventoryDTO {
  cityId:        number;
  fracten:       number;
  common_metals: number;
  leather_fur:   number;
  food:   number;
  wood:   number;
  stone:  number;
  coal:   number;
  oil:    number;
  herbs:  number;
}

export async function getCityInventory(cityId: number): Promise<CityInventoryDTO> {
  const res = await fetch(`/api/cities/${cityId}/inventory`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`getCityInventory: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function postCollectHarvest(
  cityId:           number,
  role?:            string,
  adminModeEnabled?: boolean,
): Promise<CollectHarvestResult> {
  const res = await fetch(`/api/cities/${cityId}/collect-harvest`, {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ role, adminModeEnabled }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `postCollectHarvest: ${res.status}`);
  }
  return res.json();
}

// ─── Entrepôt de ville ────────────────────────────────────────────────────────
// Capacité canonique par niveau : 1→100, 2→250, 3→500 unités totales.

export interface CityWarehouseInfoDTO {
  cityId:       number;
  hasWarehouse: boolean;
  level:        number;
  capacity:     number;
  currentTotal: number;
}

export async function getCityWarehouseInfo(cityId: number): Promise<CityWarehouseInfoDTO> {
  const res = await fetch(`/api/economy/city-warehouse-info/${cityId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`getCityWarehouseInfo: ${res.status} ${res.statusText}`);
  return res.json();
}
