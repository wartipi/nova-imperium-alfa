function getAuthHeaders(): Record<string, string> {
  const saved = localStorage.getItem("nova_imperium_auth");
  if (!saved) return {};
  const { token } = JSON.parse(saved);
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export interface OtherPlayerPosition {
  userId: string;
  username: string;
  worldX: number;
  worldY: number;
}

export async function fetchPlayerPositions(): Promise<OtherPlayerPosition[]> {
  const res = await fetch("/api/players/positions", {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error(`fetchPlayerPositions: HTTP ${res.status}`);
  return res.json();
}
