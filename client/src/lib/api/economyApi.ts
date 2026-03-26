function getAuthHeaders(): Record<string, string> {
  const saved = localStorage.getItem("nova_imperium_auth");
  if (!saved) return {};
  const { token } = JSON.parse(saved);
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export interface EconomyDTO {
  gold:              number;
  food:              number;
  lastProcessedTurn: number;
  updatedAt:         string;
  goldPerTurn:       number;
  foodPerTurn:       number;
}

export interface TickResponseDTO {
  applied: boolean;
  economy: {
    gold:              number;
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

// ─── Production tick par-ville ───────────────────────────────────────────────

export interface ProductionTickResult {
  applied: boolean;
  cities:  Array<{ cityId: number; name: string; gold: number; food: number; destination: 'bank' | 'pending' }>;
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
  playerId:           string;
  gold:               number;
  food:               number;
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
  pending:   { gold: number; food: number };
  inventory: { gold: number; food: number };
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
    pendingGold:     number;
    pendingFood:     number;
  };
}

// ─── Inventaire de transport joueur ──────────────────────────────────────────

export interface PlayerTransportDTO {
  playerId:  string;
  gold:      number;
  food:      number;
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

// ─── Transferts depuis la banque ──────────────────────────────────────────────

export interface TransferResult {
  ok: boolean;
  action: {
    id:           number;
    type:         string;
    status:       string;
    msRemaining:  number;
    minRemaining: number;
    gold:         number;
    food:         number;
  };
}

export async function postTransferBankToCity(
  cityId:           number,
  gold:             number,
  food:             number,
  adminModeEnabled?: boolean,
): Promise<TransferResult> {
  const res = await fetch("/api/economy/transfer-bank-to-city", {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ cityId, gold, food, adminModeEnabled: adminModeEnabled ?? false }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `postTransferBankToCity: ${res.status}`);
  }
  return res.json();
}

export async function postTransferBankToPlayer(
  gold:             number,
  food:             number,
  adminModeEnabled?: boolean,
): Promise<TransferResult> {
  const res = await fetch("/api/economy/transfer-bank-to-player", {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ gold, food, adminModeEnabled: adminModeEnabled ?? false }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `postTransferBankToPlayer: ${res.status}`);
  }
  return res.json();
}

// ─── Inventaire ville ─────────────────────────────────────────────────────────

export interface CityInventoryDTO {
  cityId: number;
  gold:   number;
  food:   number;
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
