export interface CompetenceLevel {
  competence: string;
  level: number;
}

export interface PlayerStateData {
  playerId: string;
  level: number;
  experience: number;
  totalExperience: number;
  actionPoints: number;
  maxActionPoints: number;
  competencePoints: number;
  competences: CompetenceLevel[];
  updatedAt: string;
}

export interface PlayerStateInput {
  level: number;
  experience: number;
  totalExperience: number;
  actionPoints: number;
  maxActionPoints: number;
  competencePoints: number;
  competences: CompetenceLevel[];
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

export async function fetchPlayerState(): Promise<PlayerStateData> {
  const res = await fetch("/api/player/state", {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(`[playerStateApi] GET /state → HTTP ${res.status}`);
  }

  const data: PlayerStateData = await res.json();
  console.log(
    `[PlayerStateApi] État chargé: level=${data.level} xp=${data.experience}` +
    ` ap=${data.actionPoints} compétences=${data.competences.length}`
  );
  return data;
}

export async function savePlayerState(state: PlayerStateInput): Promise<PlayerStateData> {
  const res = await fetch("/api/player/state", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(state),
  });

  if (!res.ok) {
    throw new Error(`[playerStateApi] POST /state → HTTP ${res.status}`);
  }

  const { state: saved }: { state: PlayerStateData } = await res.json();
  console.log(
    `[PlayerStateApi] État sauvegardé: level=${state.level} xp=${state.experience}`
  );
  return saved;
}
