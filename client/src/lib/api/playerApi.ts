export interface PlayerPositionData {
  playerId: string;
  worldX: number;
  worldY: number;
  segmentX: number;
  segmentY: number;
  updatedAt: string;
}

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

function authHeaders(): HeadersInit {
  const token = getAuthToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function fetchPlayerPosition(): Promise<PlayerPositionData> {
  const res = await fetch("/api/player/position", {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(`[playerApi] GET /position → HTTP ${res.status}`);
  }

  const data: PlayerPositionData = await res.json();
  console.log(`[PlayerApi] Position chargée: world=(${data.worldX},${data.worldY}) segment=(${data.segmentX},${data.segmentY})`);
  return data;
}

export async function savePlayerPosition(
  worldX: number,
  worldY: number
): Promise<PlayerPositionData> {
  const res = await fetch("/api/player/position", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ worldX, worldY }),
  });

  if (!res.ok) {
    throw new Error(`[playerApi] POST /position → HTTP ${res.status}`);
  }

  const { position }: { position: PlayerPositionData } = await res.json();
  console.log(`[PlayerApi] Position sauvegardée: world=(${worldX},${worldY})`);
  return position;
}
