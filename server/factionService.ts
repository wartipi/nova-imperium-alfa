import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { factions, factionMembers } from "../shared/schema";

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

function mapMember(m: {
  playerId: string;
  playerName: string;
  memberRole: string;
  joinedAt: Date;
}): FactionMemberDTO {
  return {
    id: m.playerId,
    name: m.playerName,
    role: m.memberRole as FactionMemberDTO["role"],
    joinDate: m.joinedAt.getTime(),
    contributionScore: 0,
    reputation: 0,
  };
}

function mapFaction(
  f: typeof factions.$inferSelect,
  members: FactionMemberDTO[]
): FactionDTO {
  return {
    id: String(f.id),
    name: f.name,
    description: f.description,
    charter: f.charter,
    emblem: f.emblem,
    structure: f.structure,
    foundedDate: f.createdAt.getTime(),
    founderId: f.founderId,
    founderName: f.founderName,
    members,
    type: f.type,
    recruitment: f.recruitment,
    isActive: f.isActive,
    color: f.color,
    banner: f.banner,
    motto: f.motto,
    achievements: [],
    relationships: {},
    gnEvents: [],
  };
}

export async function getAllFactions(): Promise<FactionDTO[]> {
  const rows = await db.select().from(factions).where(eq(factions.isActive, true));
  const memberRows = await db.select().from(factionMembers);

  return rows.map((f) => {
    const members = memberRows
      .filter((m) => m.factionId === f.id)
      .map(mapMember);
    return mapFaction(f, members);
  });
}

export async function getFactionById(id: number): Promise<FactionDTO | null> {
  const rows = await db.select().from(factions).where(eq(factions.id, id));
  if (rows.length === 0) return null;
  const memberRows = await db
    .select()
    .from(factionMembers)
    .where(eq(factionMembers.factionId, id));
  return mapFaction(rows[0], memberRows.map(mapMember));
}

export async function getPlayerFaction(
  playerId: string
): Promise<{ faction: FactionDTO; memberRole: string } | null> {
  const memberRows = await db
    .select()
    .from(factionMembers)
    .where(eq(factionMembers.playerId, playerId));
  if (memberRows.length === 0) return null;

  const member = memberRows[0];
  const faction = await getFactionById(member.factionId);
  if (!faction) return null;
  return { faction, memberRole: member.memberRole };
}

export async function createFaction(
  playerId: string,
  playerName: string,
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
  }
): Promise<{ faction: FactionDTO; error?: never } | { error: string; faction?: never }> {
  const existingMembership = await db
    .select({ id: factionMembers.id })
    .from(factionMembers)
    .where(eq(factionMembers.playerId, playerId));

  if (existingMembership.length > 0) {
    return { error: "ALREADY_IN_FACTION" };
  }

  const nameTaken = await db
    .select({ id: factions.id })
    .from(factions)
    .where(sql`LOWER(${factions.name}) = LOWER(${data.name})`);

  if (nameTaken.length > 0) {
    return { error: "NAME_TAKEN" };
  }

  const inserted = await db
    .insert(factions)
    .values({
      name: data.name,
      description: data.description,
      charter: data.charter,
      emblem: data.emblem,
      structure: data.structure,
      type: data.type,
      recruitment: data.recruitment,
      founderId: playerId,
      founderName: playerName,
      color: data.color,
      banner: data.banner,
      motto: data.motto,
      isActive: true,
    })
    .returning();

  const newFaction = inserted[0];

  await db.insert(factionMembers).values({
    factionId: newFaction.id,
    playerId,
    playerName,
    memberRole: "leader",
  });

  const faction = await getFactionById(newFaction.id);
  return { faction: faction! };
}

export async function joinFaction(
  playerId: string,
  playerName: string,
  factionId: number
): Promise<{ faction: FactionDTO; error?: never } | { error: string; faction?: never }> {
  const existingMembership = await db
    .select({ id: factionMembers.id })
    .from(factionMembers)
    .where(eq(factionMembers.playerId, playerId));

  if (existingMembership.length > 0) {
    return { error: "ALREADY_IN_FACTION" };
  }

  const targetFaction = await db
    .select()
    .from(factions)
    .where(eq(factions.id, factionId));

  if (targetFaction.length === 0 || !targetFaction[0].isActive) {
    return { error: "FACTION_NOT_FOUND" };
  }

  if (targetFaction[0].recruitment === "restricted") {
    return { error: "FACTION_RESTRICTED" };
  }

  await db.insert(factionMembers).values({
    factionId,
    playerId,
    playerName,
    memberRole: "member",
  });

  const faction = await getFactionById(factionId);
  return { faction: faction! };
}

export async function leaveFaction(
  playerId: string,
  factionId: number
): Promise<{ success: true; error?: never } | { error: string; success?: never }> {
  const memberRows = await db
    .select()
    .from(factionMembers)
    .where(eq(factionMembers.playerId, playerId));

  if (memberRows.length === 0 || memberRows[0].factionId !== factionId) {
    return { error: "NOT_A_MEMBER" };
  }

  await db
    .delete(factionMembers)
    .where(eq(factionMembers.playerId, playerId));

  return { success: true };
}
