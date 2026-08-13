// ─── marketApi.ts ─────────────────────────────────────────────────────────────
// API client pour le marché des ressources (/api/market/*).
// V2 : fracten comme monnaie officielle, common_metals/leather_fur remplacent iron/copper/fur.
// Distinct de marketplaceApi (cartes/objets uniques in-memory).

export type ResourceType =
  | "food" | "wood" | "stone" | "coal" | "oil" | "herbs"
  | "common_metals" | "leather_fur"                              // V2 — ressources officielles
  | "common_textiles" | "labor_contracts" | "basic_equipment"   // V3-D2 — prototype unités
  | "iron" | "copper" | "fur";                                  // V1 legacy — ordres anciens uniquement

export type OrderSide   = "buy" | "sell";
export type OrderStatus = "open" | "filled" | "cancelled";

export interface MarketGuild {
  cityId:                    number;
  tier:                      number;
  activeFeeBps:              number;
  pendingFeeBps:             number | null;
  pendingFeeAppliesAt:       string | null;
  lastFeeChangeRequestedAt:  string | null;
  createdAt:                 string;
}

export interface MarketOwner {
  ownerType:      string;
  ownerPlayerId:  string | null;
  ownerFactionId: number | null;
}

export interface MarketOrder {
  id:                number;
  cityId:            number;
  playerId:          string;
  playerName:        string;
  side:              OrderSide;
  resourceType:      ResourceType;
  pricePerUnit:      number;
  quantityTotal:     number;
  quantityRemaining: number;
  status:            OrderStatus;
  createdAt:         string;
  updatedAt:         string;
}

export interface MarketTrade {
  id:            number;
  cityId:        number;
  buyOrderId:    number;
  sellOrderId:   number;
  buyerId:       string;
  sellerId:      string;
  resourceType:  ResourceType;
  quantity:      number;
  pricePerUnit:  number;
  totalFracten:  number;
  feeBpsApplied: number;
  feeAmount:     number;
  executedAt:    string;
}

function getAuthHeaders(): Record<string, string> {
  const saved = localStorage.getItem("nova_imperium_auth");
  if (!saved) return {};
  const { token } = JSON.parse(saved);
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function apiCall<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...(options.headers ?? {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}

// ─── GET /api/market/:cityId/guild ────────────────────────────────────────────
export async function fetchMarketGuild(cityId: number): Promise<{ guild: MarketGuild; owner: MarketOwner | null }> {
  return apiCall(`/api/market/${cityId}/guild`);
}

// ─── GET /api/market/:cityId/orders ───────────────────────────────────────────
export async function fetchMarketOrders(cityId: number): Promise<MarketOrder[]> {
  return apiCall(`/api/market/${cityId}/orders`);
}

// ─── POST /api/market/:cityId/orders ──────────────────────────────────────────
export async function placeMarketOrder(
  cityId: number,
  payload: { side: OrderSide; resourceType: ResourceType; pricePerUnit: number; quantity: number },
): Promise<{ orderId: number }> {
  return apiCall(`/api/market/${cityId}/orders`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── DELETE /api/market/:cityId/orders/:orderId ───────────────────────────────
export async function cancelMarketOrder(cityId: number, orderId: number): Promise<{ success: boolean }> {
  return apiCall(`/api/market/${cityId}/orders/${orderId}`, { method: "DELETE" });
}

// ─── POST /api/market/:cityId/orders/:orderId/fill ────────────────────────────
export async function fillMarketOrder(
  cityId: number,
  orderId: number,
  quantity: number,
): Promise<{ tradeId: number; totalFracten: number; feeAmount: number }> {
  const r = await apiCall<{ tradeId: number; totalFracten: number; feeAmount: number }>(
    `/api/market/${cityId}/orders/${orderId}/fill`,
    { method: "POST", body: JSON.stringify({ quantity }) }
  );
  return { tradeId: r.tradeId, totalFracten: r.totalFracten, feeAmount: r.feeAmount };
}

// ─── GET /api/market/:cityId/trades ──────────────────────────────────────────
export async function fetchMarketTrades(cityId: number): Promise<MarketTrade[]> {
  return apiCall<MarketTrade[]>(`/api/market/${cityId}/trades`);
}

// ─── PATCH /api/market/:cityId/guild/fee ──────────────────────────────────────
export async function updateMarketFee(cityId: number, feeBps: number): Promise<{ success: boolean }> {
  return apiCall(`/api/market/${cityId}/guild/fee`, {
    method: "PATCH",
    body: JSON.stringify({ feeBps }),
  });
}

// ─── GET /api/market/fee-box/:cityId ─────────────────────────────────────────
export async function fetchMarketFeeBox(cityId: number): Promise<{ fracten: number; canCollect: boolean }> {
  return apiCall<{ fracten: number; canCollect: boolean }>(`/api/market/fee-box/${cityId}`);
}

// ─── POST /api/market/fee-box/:cityId/collect ─────────────────────────────────
export async function collectMarketFeeBox(cityId: number): Promise<{ collected: number }> {
  return apiCall(`/api/market/fee-box/${cityId}/collect`, { method: "POST" });
}

// ─── Labels V2 ────────────────────────────────────────────────────────────────
export const RESOURCE_LABELS: Record<ResourceType, string> = {
  food:             "Nourriture",
  wood:             "Bois",
  stone:            "Pierre",
  coal:             "Charbon",
  oil:              "Huile",
  herbs:            "Herbes",
  common_metals:    "Métaux communs",     // V2
  leather_fur:      "Cuir & fourrure",    // V2
  // V3-D2 : ressources prototype unités
  common_textiles:  "Textiles communs",
  labor_contracts:  "Contrats de travail",
  basic_equipment:  "Équipement basique",
  iron:             "Fer (legacy)",       // V1 legacy
  copper:           "Cuivre (legacy)",    // V1 legacy
  fur:              "Fourrure (legacy)",  // V1 legacy
};

// V2 + V3-D2 : ressources autorisées pour les NOUVEAUX ordres.
export const ALL_RESOURCES: ResourceType[] = [
  "food","wood","stone","coal","oil","herbs","common_metals","leather_fur",
  "common_textiles","labor_contracts","basic_equipment", // V3-D2
];

// V1 legacy : pour lecture des anciens ordres uniquement.
export const LEGACY_RESOURCES: ResourceType[] = ["iron","copper","fur"];
