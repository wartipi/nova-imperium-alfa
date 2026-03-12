function getAuthHeaders(): Record<string, string> {
  const saved = localStorage.getItem("nova_imperium_auth");
  if (!saved) return {};
  const { token } = JSON.parse(saved);
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export interface CityDTO {
  id: number;
  colonyId: number;
  name: string;
  displayName: string | null;
  population: number;
  worldX: number;   // coordonnée monde persistée côté serveur
  worldY: number;   // coordonnée monde persistée côté serveur
  factionId: number;
  factionName: string;
  founderName: string;
  createdAt: string;
}

// Retourne les villes de la faction du joueur connecté.
export async function fetchMyCities(): Promise<CityDTO[]> {
  const res = await fetch("/api/cities/me", {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error(`fetchMyCities: HTTP ${res.status}`);
  return res.json();
}
