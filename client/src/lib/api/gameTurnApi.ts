export interface GameClockData {
  currentTurn: number;
  turnDurationHours: number;
  turnStartedAt: string;
  nextTurnAt: string;
  serverNow: string;
}

export async function fetchGameClock(): Promise<GameClockData> {
  const res = await fetch("/api/game/clock");
  if (!res.ok) throw new Error(`fetchGameClock: ${res.status}`);
  return res.json();
}
