function getAuthHeaders(): Record<string, string> {
  const saved = localStorage.getItem("nova_imperium_auth");
  if (!saved) return {};
  const { token } = JSON.parse(saved);
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export interface UnitDTO {
  id:          string;
  type:        string;
  name:        string;
  x:           number;
  y:           number;
  strength:    number;
  attack:      number;
  defense:     number;
  health:      number;
  maxHealth:   number;
  movement:    number;
  maxMovement: number;
  experience:  number;
  abilities:   string[];
}

export async function apiGetMyUnits(): Promise<UnitDTO[]> {
  const res = await fetch("/api/units/me", {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error(`apiGetMyUnits: HTTP ${res.status}`);
  return res.json();
}
