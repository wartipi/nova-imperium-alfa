function getAuthHeaders(): Record<string, string> {
  try {
    const saved = localStorage.getItem("nova_imperium_auth");
    if (!saved) return {};
    const { token } = JSON.parse(saved);
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

export type TreatyType =
  | "alliance_militaire"
  | "accord_commercial"
  | "pacte_non_agression"
  | "defense_mutuelle";

export interface TreatyTypeInfo {
  type: TreatyType;
  name: string;
  description: string;
  cost: number;
  icon: string;
}

export interface TreatyParty {
  id: number;
  name: string;
}

export interface TreatySignatureDTO {
  factionId: number;
  signedBy: string;
  signedAt: string;
}

export interface TreatyDTO {
  id: string;
  title: string;
  type: TreatyType;
  terms: string;
  status: "proposed" | "active" | "broken" | "expired";
  createdBy: string;
  createdByFactionId: number;
  properties: Record<string, unknown>;
  createdAt: string;
  expiresAt: string | null;
  parties: TreatyParty[];
  signatures: TreatySignatureDTO[];
}

export async function apiFetchTreatyTypes(): Promise<TreatyTypeInfo[]> {
  const res = await fetch("/api/treaties/types");
  if (!res.ok) throw new Error("Erreur chargement types de traités");
  return res.json();
}

export async function apiFetchMyTreaties(): Promise<TreatyDTO[]> {
  const res = await fetch("/api/treaties/me", {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error("Erreur chargement traités");
  return res.json();
}

export async function apiFetchAllTreaties(): Promise<TreatyDTO[]> {
  const res = await fetch("/api/treaties", {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Erreur chargement traités (admin)");
  }
  return res.json();
}

export async function apiCreateTreaty(
  title: string,
  type: TreatyType,
  terms: string,
  targetFactionIds: number[],
  properties: Record<string, unknown>,
  adminMode: boolean = false
): Promise<TreatyDTO> {
  const res = await fetch("/api/treaties", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Mode": String(adminMode),
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ title, type, terms, targetFactionIds, properties }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string; error?: string }).message || (err as { error?: string }).error || "Erreur création traité");
  }
  return res.json();
}

export async function apiSignTreaty(treatyId: string): Promise<TreatyDTO> {
  const res = await fetch(`/api/treaties/${treatyId}/sign`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Erreur signature traité");
  }
  return res.json();
}

export async function apiBreakTreaty(treatyId: string): Promise<TreatyDTO> {
  const res = await fetch(`/api/treaties/${treatyId}/break`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Erreur rupture traité");
  }
  return res.json();
}
