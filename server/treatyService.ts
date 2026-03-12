import { eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { treaties, treatyFactions, treatySignatures, factionMembers, factions } from "../shared/schema";
import { ACTIVE_TREATY_TYPES } from "./treatyTypes";
import crypto from "crypto";

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
  type: string;
  terms: string;
  status: string;
  createdBy: string;
  createdByFactionId: number;
  properties: Record<string, unknown>;
  createdAt: string;
  expiresAt: string | null;
  parties: TreatyParty[];
  signatures: TreatySignatureDTO[];
}

async function getFactionIdForUser(userId: string): Promise<number | null> {
  const rows = await db
    .select({ factionId: factionMembers.factionId })
    .from(factionMembers)
    .where(eq(factionMembers.playerId, userId))
    .limit(1);
  return rows.length ? rows[0].factionId : null;
}

async function enrichTreaties(treatyRows: typeof treaties.$inferSelect[]): Promise<TreatyDTO[]> {
  if (!treatyRows.length) return [];

  const ids = treatyRows.map((t) => t.id);

  const [tfRows, sigRows, factionRows] = await Promise.all([
    db.select().from(treatyFactions).where(inArray(treatyFactions.treatyId, ids)),
    db.select().from(treatySignatures).where(inArray(treatySignatures.treatyId, ids)),
    db.select({ id: factions.id, name: factions.name }).from(factions),
  ]);

  return treatyRows.map((t) => {
    const myFactions = tfRows.filter((r) => r.treatyId === t.id);
    const mySigs = sigRows.filter((r) => r.treatyId === t.id);

    const parties: TreatyParty[] = myFactions.map((r) => {
      const f = factionRows.find((f) => f.id === r.factionId);
      return { id: r.factionId, name: f?.name ?? "Faction inconnue" };
    });

    const signatures: TreatySignatureDTO[] = mySigs.map((s) => ({
      factionId: s.factionId,
      signedBy: s.signedBy,
      signedAt: s.signedAt.toISOString(),
    }));

    return {
      id: t.id,
      title: t.title,
      type: t.type,
      terms: t.terms,
      status: t.status,
      createdBy: t.createdBy,
      createdByFactionId: t.createdByFactionId,
      properties: (t.properties as Record<string, unknown>) ?? {},
      createdAt: t.createdAt.toISOString(),
      expiresAt: t.expiresAt ? t.expiresAt.toISOString() : null,
      parties,
      signatures,
    };
  });
}

export async function getMyTreaties(userId: string): Promise<TreatyDTO[]> {
  const factionId = await getFactionIdForUser(userId);
  if (factionId === null) return [];

  const tfRows = await db
    .select({ treatyId: treatyFactions.treatyId })
    .from(treatyFactions)
    .where(eq(treatyFactions.factionId, factionId));

  if (!tfRows.length) return [];

  const treatyIds = tfRows.map((r) => r.treatyId);
  const treatyRows = await db
    .select()
    .from(treaties)
    .where(inArray(treaties.id, treatyIds));

  return enrichTreaties(treatyRows);
}

export async function getAllTreaties(): Promise<TreatyDTO[]> {
  const treatyRows = await db.select().from(treaties);
  return enrichTreaties(treatyRows);
}

export async function createTreaty(
  userId: string,
  title: string,
  type: string,
  terms: string,
  targetFactionIds: number[],
  properties: Record<string, unknown>
): Promise<TreatyDTO> {
  const creatorFactionId = await getFactionIdForUser(userId);
  if (creatorFactionId === null) {
    throw Object.assign(new Error("Vous devez appartenir à une faction pour créer un traité"), { status: 403 });
  }

  const validType = ACTIVE_TREATY_TYPES.find((t) => t.type === type);
  if (!validType) {
    throw Object.assign(new Error("Type de traité invalide"), { status: 400 });
  }
  if (!title.trim()) {
    throw Object.assign(new Error("Le titre du traité ne peut pas être vide"), { status: 400 });
  }
  if (!terms.trim()) {
    throw Object.assign(new Error("Les termes du traité ne peuvent pas être vides"), { status: 400 });
  }
  if (!targetFactionIds.length) {
    throw Object.assign(new Error("Au moins une faction cible est requise"), { status: 400 });
  }
  if (targetFactionIds.includes(creatorFactionId)) {
    throw Object.assign(new Error("Vous ne pouvez pas cibler votre propre faction"), { status: 400 });
  }

  const id = crypto.randomUUID();

  await db.insert(treaties).values({
    id,
    title: title.trim(),
    type,
    terms: terms.trim(),
    status: "proposed",
    createdBy: userId,
    createdByFactionId: creatorFactionId,
    properties: properties ?? {},
  });

  const allFactionIds = [creatorFactionId, ...targetFactionIds];
  for (const fid of allFactionIds) {
    await db.insert(treatyFactions).values({ treatyId: id, factionId: fid });
  }

  await db.insert(treatySignatures).values({
    treatyId: id,
    factionId: creatorFactionId,
    signedBy: userId,
  });

  const [row] = await db.select().from(treaties).where(eq(treaties.id, id)).limit(1);
  const [dto] = await enrichTreaties([row]);
  return dto;
}

export async function signTreaty(userId: string, treatyId: string): Promise<TreatyDTO> {
  const factionId = await getFactionIdForUser(userId);
  if (factionId === null) {
    throw Object.assign(new Error("Vous devez appartenir à une faction pour signer un traité"), { status: 403 });
  }

  const [treaty] = await db.select().from(treaties).where(eq(treaties.id, treatyId)).limit(1);
  if (!treaty) {
    throw Object.assign(new Error("Traité introuvable"), { status: 404 });
  }
  if (treaty.status !== "proposed") {
    throw Object.assign(new Error("Ce traité n'est pas en attente de signature"), { status: 422 });
  }

  const partyRow = await db
    .select()
    .from(treatyFactions)
    .where(eq(treatyFactions.treatyId, treatyId))
    .then((rows) => rows.find((r) => r.factionId === factionId));

  if (!partyRow) {
    throw Object.assign(new Error("Votre faction n'est pas partie à ce traité"), { status: 403 });
  }

  const alreadySigned = await db
    .select()
    .from(treatySignatures)
    .where(eq(treatySignatures.treatyId, treatyId))
    .then((rows) => rows.some((r) => r.factionId === factionId));

  if (alreadySigned) {
    throw Object.assign(new Error("Votre faction a déjà signé ce traité"), { status: 409 });
  }

  await db.insert(treatySignatures).values({ treatyId, factionId, signedBy: userId });

  const [totalParties, totalSigs] = await Promise.all([
    db.select().from(treatyFactions).where(eq(treatyFactions.treatyId, treatyId)).then((r) => r.length),
    db.select().from(treatySignatures).where(eq(treatySignatures.treatyId, treatyId)).then((r) => r.length),
  ]);

  if (totalSigs >= totalParties) {
    await db.update(treaties).set({ status: "active" }).where(eq(treaties.id, treatyId));
  }

  const [row] = await db.select().from(treaties).where(eq(treaties.id, treatyId)).limit(1);
  const [dto] = await enrichTreaties([row]);
  return dto;
}

export async function breakTreaty(userId: string, treatyId: string): Promise<TreatyDTO> {
  const factionId = await getFactionIdForUser(userId);
  if (factionId === null) {
    throw Object.assign(new Error("Vous devez appartenir à une faction pour rompre un traité"), { status: 403 });
  }

  const [treaty] = await db.select().from(treaties).where(eq(treaties.id, treatyId)).limit(1);
  if (!treaty) {
    throw Object.assign(new Error("Traité introuvable"), { status: 404 });
  }
  if (treaty.status !== "active") {
    throw Object.assign(new Error("Seul un traité actif peut être rompu"), { status: 422 });
  }

  const partyRow = await db
    .select()
    .from(treatyFactions)
    .where(eq(treatyFactions.treatyId, treatyId))
    .then((rows) => rows.find((r) => r.factionId === factionId));

  if (!partyRow) {
    throw Object.assign(new Error("Votre faction n'est pas partie à ce traité"), { status: 403 });
  }

  await db.update(treaties).set({ status: "broken" }).where(eq(treaties.id, treatyId));

  const [row] = await db.select().from(treaties).where(eq(treaties.id, treatyId)).limit(1);
  const [dto] = await enrichTreaties([row]);
  return dto;
}
