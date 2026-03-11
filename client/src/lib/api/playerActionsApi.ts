export interface PathStep {
  worldX: number;
  worldY: number;
  terrain: string;
  cost: number;
}

export interface ActiveAction {
  id: number;
  type: string;
  status: "in_progress" | "completed" | "cancelled";
  startWorldX: number;
  startWorldY: number;
  endWorldX: number;
  endWorldY: number;
  totalCost: number;
  startTime: string;
  expectedEndTime: string;
  completedAt: string | null;
  msRemaining: number;
  path: PathStep[];
}

export interface MoveActionResponse {
  ok: true;
  action: ActiveAction;
}

export interface CurrentActionResponse {
  action: ActiveAction | null;
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

export async function requestMove(
  destinationWorldX: number,
  destinationWorldY: number,
  adminModeEnabled: boolean = false
): Promise<MoveActionResponse> {
  const res = await fetch("/api/player/actions/move", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Mode": String(adminModeEnabled),
      ...authHeaders(),
    },
    body: JSON.stringify({ destinationWorldX, destinationWorldY }),
  });

  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.message ?? data.error ?? `HTTP ${res.status}`);
    (err as Error & { code?: string; serverAction?: ActiveAction }).code = data.error;
    (err as Error & { code?: string; serverAction?: ActiveAction }).serverAction = data.action;
    throw err;
  }

  console.log(
    `[PlayerActionsApi] Move créé id=${data.action.id}` +
    ` → (${destinationWorldX},${destinationWorldY})` +
    ` coût=${data.action.totalCost}AP` +
    ` fin=${data.action.expectedEndTime}`
  );
  return data as MoveActionResponse;
}

export async function fetchCurrentAction(): Promise<CurrentActionResponse> {
  const res = await fetch("/api/player/actions/current", {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(`[PlayerActionsApi] GET /current → HTTP ${res.status}`);
  }

  const data: CurrentActionResponse = await res.json();

  if (data.action) {
    console.log(
      `[PlayerActionsApi] Action active: id=${data.action.id}` +
      ` status=${data.action.status}` +
      ` msRemaining=${Math.round(data.action.msRemaining / 60000)}min`
    );
  }

  return data;
}

export async function cancelCurrentAction(): Promise<{ ok: boolean; action: { id: number; status: string } }> {
  const res = await fetch("/api/player/actions/current", {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }

  const data = await res.json();
  console.log(`[PlayerActionsApi] Action annulée id=${data.action.id}`);
  return data;
}
