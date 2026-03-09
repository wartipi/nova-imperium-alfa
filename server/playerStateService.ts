import { eq } from "drizzle-orm";
import { db } from "./db";
import { playerState } from "../shared/schema";
import type { PlayerStateRecord } from "../shared/schema";

interface CompetenceLevel {
  competence: string;
  level: number;
}

interface PlayerStateInput {
  level: number;
  experience: number;
  totalExperience: number;
  actionPoints: number;
  maxActionPoints: number;
  competencePoints: number;
  competences: CompetenceLevel[];
}

const DEFAULT_STATE: PlayerStateInput = {
  level: 1,
  experience: 0,
  totalExperience: 0,
  actionPoints: 25,
  maxActionPoints: 100,
  competencePoints: 3,
  competences: [],
};

export async function getPlayerState(playerId: string): Promise<PlayerStateRecord | null> {
  const [row] = await db
    .select()
    .from(playerState)
    .where(eq(playerState.playerId, playerId));
  return row ?? null;
}

export async function savePlayerState(
  playerId: string,
  state: PlayerStateInput
): Promise<PlayerStateRecord> {
  const [row] = await db
    .insert(playerState)
    .values({
      playerId,
      level: state.level,
      experience: state.experience,
      totalExperience: state.totalExperience,
      actionPoints: state.actionPoints,
      maxActionPoints: state.maxActionPoints,
      competencePoints: state.competencePoints,
      competences: state.competences,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: playerState.playerId,
      set: {
        level: state.level,
        experience: state.experience,
        totalExperience: state.totalExperience,
        actionPoints: state.actionPoints,
        maxActionPoints: state.maxActionPoints,
        competencePoints: state.competencePoints,
        competences: state.competences,
        updatedAt: new Date(),
      },
    })
    .returning();

  console.log(
    `[PlayerState] Sauvegardé: player=${playerId}` +
    ` level=${state.level} xp=${state.experience} ap=${state.actionPoints}` +
    ` compétences=${state.competences.length}`
  );
  return row;
}

export async function ensurePlayerState(playerId: string): Promise<PlayerStateRecord> {
  const existing = await getPlayerState(playerId);
  if (existing) {
    console.log(
      `[PlayerState] Existant: player=${playerId}` +
      ` level=${existing.level} xp=${existing.experience} ap=${existing.actionPoints}`
    );
    return existing;
  }

  console.log(`[PlayerState] Aucun état pour player=${playerId} — création par défaut`);
  return savePlayerState(playerId, DEFAULT_STATE);
}
