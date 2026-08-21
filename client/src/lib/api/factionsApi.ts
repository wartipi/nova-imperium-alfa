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

function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export interface FactionMemberDTO {
  id: string;
  name: string;
  role: "leader" | "officer" | "member";
  joinDate: number;
  contributionScore: number;
  reputation: number;
}

export interface FactionDTO {
  id: string;
  name: string;
  description: string;
  charter: string;
  emblem: string;
  structure: string;
  foundedDate: number;
  founderId: string;
  founderName: string;
  members: FactionMemberDTO[];
  type: string;
  recruitment: string;
  isActive: boolean;
  color: string;
  banner: string;
  motto: string;
  achievements: string[];
  relationships: Record<string, number>;
  gnEvents: string[];
}

export interface PlayerFactionResponse {
  faction: FactionDTO | null;
  memberRole: string | null;
}

export async function fetchAllFactions(): Promise<FactionDTO[]> {
  const res = await fetch("/api/factions");
  if (!res.ok) throw new Error("Erreur chargement factions");
  return res.json();
}

export async function fetchMyFaction(): Promise<PlayerFactionResponse> {
  const token = getAuthToken();
  if (!token) return { faction: null, memberRole: null };

  const res = await fetch("/api/factions/me", {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Erreur chargement faction joueur");
  return res.json();
}

export async function apiCreateFaction(
  data: {
    name: string;
    description: string;
    charter: string;
    emblem: string;
    structure: string;
    type: string;
    recruitment: string;
    color: string;
    banner: string;
    motto: string;
  },
  adminMode: boolean = false
): Promise<FactionDTO> {
  const extraHeaders: Record<string, string> = adminMode
    ? { 'X-Admin-Mode': 'true' }
    : {};
  const res = await fetch("/api/factions", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders(), ...extraHeaders },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string; error?: string }).message ||
      (err as { message?: string; error?: string }).error ||
      "Erreur création faction"
    );
  }
  return res.json();
}

export async function apiJoinFaction(factionId: string): Promise<FactionDTO> {
  const res = await fetch(`/api/factions/${factionId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erreur adhésion faction");
  }
  const body = await res.json();
  return body.faction;
}

export async function apiLeaveFaction(factionId: string): Promise<void> {
  const res = await fetch(`/api/factions/${factionId}/leave`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erreur sortie faction");
  }
}
