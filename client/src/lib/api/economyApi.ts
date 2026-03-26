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
