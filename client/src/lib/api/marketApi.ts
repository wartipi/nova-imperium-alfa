// ─── marketApi.ts ─────────────────────────────────────────────────────────────
// API client pour le marché des ressources (/api/market/*).
// Distinct de marketplaceApi (cartes/objets uniques in-memory).

export type ResourceType =
  | "food" | "wood" | "stone" | "iron" | "copper"
  | "coal"  | "oil"  | "herbs" | "fur";

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
  totalGold:     number;
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
): Promise<{ tradeId: number; totalGold: number; feeAmount: number }> {
  return apiCall(`/api/market/${cityId}/orders/${orderId}/fill`, {
    method: "POST",
    body: JSON.stringify({ quantity }),
  });
}

// ─── GET /api/market/:cityId/trades ──────────────────────────────────────────
export async function fetchMarketTrades(cityId: number): Promise<MarketTrade[]> {
  return apiCall(`/api/market/${cityId}/trades`);
}

// ─── PATCH /api/market/:cityId/guild/fee ──────────────────────────────────────
export async function updateMarketFee(cityId: number, feeBps: number): Promise<{ success: boolean }> {
  return apiCall(`/api/market/${cityId}/guild/fee`, {
    method: "PATCH",
    body: JSON.stringify({ feeBps }),
  });
}

export const RESOURCE_LABELS: Record<ResourceType, string> = {
  food:   "Nourriture",
  wood:   "Bois",
  stone:  "Pierre",
  iron:   "Fer",
  copper: "Cuivre",
  coal:   "Charbon",
  oil:    "Huile",
  herbs:  "Herbes",
  fur:    "Fourrure",
};

export const ALL_RESOURCES: ResourceType[] = [
  "food","wood","stone","iron","copper","coal","oil","herbs","fur",
];
