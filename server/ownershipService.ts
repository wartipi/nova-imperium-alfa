import { eq } from "drizzle-orm";
import { db } from "./db";
import { colonies, factionMembers, factions } from "../shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

type ColonyRow = typeof colonies.$inferSelect;

export type TransferPayload =
  | { targetOwnerType: "player"; targetPlayerId: string }
  | { targetOwnerType: "faction"; targetFactionId: number };

// ─── canAccessColony ──────────────────────────────────────────────────────────
// Droit d'accès opérationnel : consultation, construction, recrutement, etc.
// ownerType='faction' → tout membre de la faction propriétaire a accès.
// ownerType='player'  → uniquement le joueur propriétaire.
export async function canAccessColony(
  playerId: string,
  colony: ColonyRow,
): Promise<boolean> {
  if (colony.ownerType === "player") {
    return colony.ownerPlayerId === playerId;
  }
  // ownerType === 'faction'
  if (!colony.ownerFactionId) return false;
  const rows = await db
    .select({ factionId: factionMembers.factionId })
    .from(factionMembers)
    .where(eq(factionMembers.playerId, playerId));
  return rows.some((r) => r.factionId === colony.ownerFactionId);
}

// ─── canTransferColony ────────────────────────────────────────────────────────
// Droit de transfert de propriété — logique PLUS STRICTE que canAccessColony.
// ownerType='player'  → le joueur propriétaire lui-même, ou admin.
// ownerType='faction' → admin uniquement (gouvernance faction non définie en Phase 11).
export function canTransferColony(
  playerId: string,
  requesterRole: string,
  colony: ColonyRow,
): boolean {
  if (requesterRole === "admin") return true;
  if (colony.ownerType === "player") {
    return colony.ownerPlayerId === playerId;
  }
  // ownerType === 'faction' → admin uniquement
  return false;
}

// ─── transferColonyOwnership ──────────────────────────────────────────────────
// Transfère l'ownership d'une colonie.
// - Valide le droit du demandeur via canTransferColony.
// - Valide que la cible existe réellement (DB).
// - Hydrate le nom cible côté serveur — ne fait pas confiance au client.
// - Ne touche pas à founderId / founderName / factionId (legacy).
export async function transferColonyOwnership(
  colonyId: number,
  requestingPlayerId: string,
  requesterRole: string,
  payload: TransferPayload,
): Promise<{ success: true } | { error: string; status: number }> {
  // 1. Charger la colonie courante
  const colonyRows = await db
    .select()
    .from(colonies)
    .where(eq(colonies.id, colonyId));

  if (colonyRows.length === 0) {
    return { error: "Colonie introuvable", status: 404 };
  }

  const colony = colonyRows[0];

  // 2. Vérifier le droit de transfert
  if (!canTransferColony(requestingPlayerId, requesterRole, colony)) {
    return {
      error:
        colony.ownerType === "faction"
          ? "Seul un administrateur peut transférer une colonie de faction"
          : "Seul le propriétaire ou un administrateur peut transférer cette colonie",
      status: 403,
    };
  }

  // 3. Valider et hydrater la cible
  if (payload.targetOwnerType === "player") {
    // Lookup du joueur cible via factionMembers (seuls les joueurs actifs ont une entrée)
    const memberRows = await db
      .select({ playerName: factionMembers.playerName })
      .from(factionMembers)
      .where(eq(factionMembers.playerId, payload.targetPlayerId))
      .limit(1);

    if (memberRows.length === 0) {
      return {
        error: `Joueur cible introuvable (id: ${payload.targetPlayerId}) — il doit appartenir à une faction`,
        status: 422,
      };
    }

    const targetPlayerName = memberRows[0].playerName;

    await db
      .update(colonies)
      .set({
        ownerType:        "player",
        ownerPlayerId:    payload.targetPlayerId,
        ownerPlayerName:  targetPlayerName,
        ownerFactionId:   null,
        ownerFactionName: null,
      })
      .where(eq(colonies.id, colonyId));

    console.log(
      `[transferColonyOwnership] colonie #${colonyId} → player:${payload.targetPlayerId} (${targetPlayerName})`,
    );
    return { success: true };
  }

  // payload.targetOwnerType === 'faction'
  const factionRows = await db
    .select({ name: factions.name, isActive: factions.isActive })
    .from(factions)
    .where(eq(factions.id, payload.targetFactionId));

  if (factionRows.length === 0 || !factionRows[0].isActive) {
    return {
      error: `Faction cible introuvable ou inactive (id: ${payload.targetFactionId})`,
      status: 422,
    };
  }

  const targetFactionName = factionRows[0].name;

  await db
    .update(colonies)
    .set({
      ownerType:        "faction",
      ownerFactionId:   payload.targetFactionId,
      ownerFactionName: targetFactionName,
      ownerPlayerId:    null,
      ownerPlayerName:  null,
    })
    .where(eq(colonies.id, colonyId));

  console.log(
    `[transferColonyOwnership] colonie #${colonyId} → faction:${payload.targetFactionId} (${targetFactionName})`,
  );
  return { success: true };
}
