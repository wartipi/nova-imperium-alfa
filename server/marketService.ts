import { db } from "./db";
import {
  marketGuilds, marketOrders, marketTrades,
  playerBank, factionEconomy, cityBuildings, cities, colonies,
} from "../shared/schema";
import { eq, and, sql, desc, lte } from "drizzle-orm";
import { creditFactionGold } from "./economyService";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ResourceType =
  | "food" | "wood" | "stone" | "iron" | "copper"
  | "coal"  | "oil"  | "herbs" | "fur";

const VALID_RESOURCES: ReadonlySet<string> = new Set([
  "food","wood","stone","iron","copper","coal","oil","herbs","fur",
]);

const TIER_CAPS: Record<number, number> = { 1: 600, 2: 1200, 3: 2000, 4: 2500 };
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 h en ms

// ─── resolveMarketContext ─────────────────────────────────────────────────────
// Résout le contexte de marché pour une ville donnée.
// Ne throw JAMAIS 403 — toute ville peut servir de point d'accès au réseau.
// Sans guilde : feeBps = 500 (5%). Avec guilde : feeBps = market_guilds.activeFeeBps.
export interface MarketContext {
  hasGuild:    boolean;
  feeBps:      number;
  guildRecord: typeof marketGuilds.$inferSelect | null;
}

export async function resolveMarketContext(cityId: number): Promise<MarketContext> {
  const [buildingRow] = await db
    .select({ building: cityBuildings.building })
    .from(cityBuildings)
    .where(and(eq(cityBuildings.cityId, cityId), eq(cityBuildings.building, "guilde_des_marchands")))
    .limit(1);

  if (!buildingRow) {
    return { hasGuild: false, feeBps: 500, guildRecord: null };
  }

  // Création lazy de la ligne market_guilds si absente.
  await db
    .insert(marketGuilds)
    .values({ cityId, tier: 1, activeFeeBps: 0 })
    .onConflictDoNothing();

  const [guild] = await db.select().from(marketGuilds).where(eq(marketGuilds.cityId, cityId)).limit(1);
  return {
    hasGuild:    true,
    feeBps:      guild?.activeFeeBps ?? 0,
    guildRecord: guild ?? null,
  };
}

// ─── deriveMarketOwner ────────────────────────────────────────────────────────
// Dérive le propriétaire du marché via cities → colonies (ownership canonique).
// Ne stocke jamais l'owner dans market_guilds.
async function deriveMarketOwner(cityId: number) {
  const [row] = await db
    .select({
      ownerType:       colonies.ownerType,
      ownerPlayerId:   colonies.ownerPlayerId,
      ownerFactionId:  colonies.ownerFactionId,
    })
    .from(cities)
    .innerJoin(colonies, eq(cities.colonyId, colonies.id))
    .where(eq(cities.id, cityId))
    .limit(1);

  return row ?? null;
}

// ─── promoteFeeLazy ───────────────────────────────────────────────────────────
// Promeut pendingFeeBps → activeFeeBps si pendingFeeAppliesAt <= now().
// Doit être appelé à l'intérieur d'une transaction avant tout calcul de commission.
async function promoteFeeLazy(cityId: number, tx: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]) {
  const now = new Date();
  await (tx as typeof db)
    .update(marketGuilds)
    .set({
      activeFeeBps:            marketGuilds.pendingFeeBps,
      pendingFeeBps:           null,
      pendingFeeAppliesAt:     null,
    })
    .where(
      and(
        eq(marketGuilds.cityId, cityId),
        sql`${marketGuilds.pendingFeeAppliesAt} IS NOT NULL`,
        lte(marketGuilds.pendingFeeAppliesAt, now),
      ),
    );
}

// ─── getMarketInfo ────────────────────────────────────────────────────────────
// Retourne le contexte marché sans gate dur.
export async function getMarketInfo(cityId: number) {
  const context = await resolveMarketContext(cityId);
  const owner   = await deriveMarketOwner(cityId);
  return {
    guild:    context.guildRecord,
    hasGuild: context.hasGuild,
    feeBps:   context.feeBps,
    owner,
  };
}

// ─── getOpenOrders ────────────────────────────────────────────────────────────
// Réseau global : retourne TOUS les ordres ouverts, sans filtre cityId.
// cityId transmis par la route reste le point d'entrée de contexte, non filtrant.
export async function getOpenOrders(_cityId: number) {
  return db
    .select()
    .from(marketOrders)
    .where(eq(marketOrders.status, "open"))
    .orderBy(desc(marketOrders.createdAt));
}

// ─── getTradeHistory ──────────────────────────────────────────────────────────
// Réseau global : retourne les 100 derniers trades, sans filtre cityId.
export async function getTradeHistory(_cityId: number) {
  return db
    .select()
    .from(marketTrades)
    .orderBy(desc(marketTrades.executedAt))
    .limit(100);
}

// ─── Helpers ressource player_bank ───────────────────────────────────────────
// Accède dynamiquement à la colonne de ressource correcte.
function resourceCol(res: ResourceType) {
  const map: Record<ResourceType, typeof playerBank.food> = {
    food:   playerBank.food,
    wood:   playerBank.wood,
    stone:  playerBank.stone,
    iron:   playerBank.iron,
    copper: playerBank.copper,
    coal:   playerBank.coal,
    oil:    playerBank.oil,
    herbs:  playerBank.herbs,
    fur:    playerBank.fur,
  };
  return map[res];
}

async function ensurePlayerBank(playerId: string, tx?: any) {
  const target = tx ?? db;
  await target
    .insert(playerBank)
    .values({ playerId, gold: 0, food: 0, wood: 0, stone: 0, iron: 0,
              copper: 0, coal: 0, oil: 0, herbs: 0, fur: 0, lastProductionTurn: 0 })
    .onConflictDoNothing();
}

// Débite des ressources atomiquement. Retourne false si insuffisant.
async function debitResource(playerId: string, res: ResourceType, qty: number, tx?: any): Promise<boolean> {
  const target = tx ?? db;
  const col = resourceCol(res);
  const updated = await target
    .update(playerBank)
    .set({ [res]: sql`${col} - ${qty}`, updatedAt: new Date() })
    .where(and(eq(playerBank.playerId, playerId), sql`${col} >= ${qty}`))
    .returning({ val: col });
  return updated.length > 0;
}

// Crédite des ressources.
async function creditResource(playerId: string, res: ResourceType, qty: number, tx?: any): Promise<void> {
  const target = tx ?? db;
  const col = resourceCol(res);
  await target
    .update(playerBank)
    .set({ [res]: sql`${col} + ${qty}`, updatedAt: new Date() })
    .where(eq(playerBank.playerId, playerId));
}

// Débite de l'or atomiquement. Retourne false si insuffisant.
async function debitGold(playerId: string, amount: number, tx?: any): Promise<boolean> {
  const target = tx ?? db;
  const updated = await target
    .update(playerBank)
    .set({ gold: sql`${playerBank.gold} - ${amount}`, updatedAt: new Date() })
    .where(and(eq(playerBank.playerId, playerId), sql`${playerBank.gold} >= ${amount}`))
    .returning({ gold: playerBank.gold });
  return updated.length > 0;
}

// Crédite de l'or.
async function creditGoldPlayer(playerId: string, amount: number, tx?: any): Promise<void> {
  if (amount <= 0) return;
  const target = tx ?? db;
  await target
    .update(playerBank)
    .set({ gold: sql`${playerBank.gold} + ${amount}`, updatedAt: new Date() })
    .where(eq(playerBank.playerId, playerId));
}

// ─── placeOrder ───────────────────────────────────────────────────────────────
// Validation + escrow + création de l'ordre. AUCUN auto-match.
export async function placeOrder(
  cityId:       number,
  playerId:     string,
  playerName:   string,
  side:         string,
  resourceType: string,
  pricePerUnit: number,
  quantity:     number,
): Promise<{ orderId: number }> {
  if (side !== "buy" && side !== "sell")
    throw Object.assign(new Error("side doit être 'buy' ou 'sell'"), { status: 400 });
  if (!VALID_RESOURCES.has(resourceType))
    throw Object.assign(new Error(`resourceType invalide: ${resourceType}`), { status: 400 });
  if (!Number.isInteger(pricePerUnit) || pricePerUnit <= 0)
    throw Object.assign(new Error("pricePerUnit doit être un entier positif"), { status: 400 });
  if (!Number.isInteger(quantity) || quantity <= 0)
    throw Object.assign(new Error("quantity doit être un entier positif"), { status: 400 });

  // Réseau global : pas de gate guilde. La ville sert de point d'entrée de création d'ordre.
  await ensurePlayerBank(playerId);

  const res = resourceType as ResourceType;

  // Escrow
  if (side === "sell") {
    const ok = await debitResource(playerId, res, quantity);
    if (!ok) throw Object.assign(new Error(`Ressources insuffisantes pour l'escrow (${quantity}× ${res})`), { status: 422 });
  } else {
    const totalGold = quantity * pricePerUnit;
    const ok = await debitGold(playerId, totalGold);
    if (!ok) throw Object.assign(new Error(`Or insuffisant pour l'escrow (${totalGold} or requis)`), { status: 422 });
  }

  const [order] = await db
    .insert(marketOrders)
    .values({
      cityId,
      playerId,
      playerName,
      side,
      resourceType: res,
      pricePerUnit,
      quantityTotal:     quantity,
      quantityRemaining: quantity,
      status: "open",
    })
    .returning({ id: marketOrders.id });

  console.log(`[market] placeOrder orderId=${order.id} cityId=${cityId} player=${playerId} side=${side} ${quantity}×${res} @${pricePerUnit}g`);
  return { orderId: order.id };
}

// ─── cancelOrder ─────────────────────────────────────────────────────────────
// Annulation propriétaire ou admin. Retourne l'escrow résiduel.
export async function cancelOrder(
  orderId:     number,
  requesterId: string,
  isAdmin:     boolean,
): Promise<void> {
  const [order] = await db.select().from(marketOrders).where(eq(marketOrders.id, orderId)).limit(1);
  if (!order) throw Object.assign(new Error("Ordre introuvable"), { status: 404 });
  if (order.status !== "open") throw Object.assign(new Error("Seul un ordre ouvert peut être annulé"), { status: 400 });
  if (!isAdmin && order.playerId !== requesterId)
    throw Object.assign(new Error("Accès refusé : vous n'êtes pas le propriétaire de cet ordre"), { status: 403 });

  // Réseau global : pas de gate guilde pour l'annulation d'un ordre.
  // Retour escrow résiduel
  await ensurePlayerBank(order.playerId);
  if (order.side === "sell") {
    await creditResource(order.playerId, order.resourceType as ResourceType, order.quantityRemaining);
  } else {
    const goldBack = order.quantityRemaining * order.pricePerUnit;
    await creditGoldPlayer(order.playerId, goldBack);
  }

  await db
    .update(marketOrders)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(marketOrders.id, orderId));

  console.log(`[market] cancelOrder orderId=${orderId} escrow retourné`);
}

// ─── fillOrder ────────────────────────────────────────────────────────────────
// Fill explicite (partiel ou total). Transaction atomique.
export async function fillOrder(
  orderId:    number,
  fillerId:   string,
  fillerName: string,
  quantity:   number,
): Promise<{ tradeId: number; totalGold: number; feeAmount: number }> {
  if (!Number.isInteger(quantity) || quantity <= 0)
    throw Object.assign(new Error("quantity doit être un entier positif"), { status: 400 });

  const [order] = await db.select().from(marketOrders).where(eq(marketOrders.id, orderId)).limit(1);
  if (!order) throw Object.assign(new Error("Ordre introuvable"), { status: 404 });
  if (order.status !== "open") throw Object.assign(new Error("L'ordre n'est plus ouvert"), { status: 400 });
  if (order.playerId === fillerId) throw Object.assign(new Error("Vous ne pouvez pas remplir votre propre ordre"), { status: 400 });
  if (quantity > order.quantityRemaining)
    throw Object.assign(new Error(`Quantité demandée (${quantity}) dépasse le résiduel de l'ordre (${order.quantityRemaining})`), { status: 400 });

  // Résoudre le contexte de frais depuis la ville d'origine de l'ordre (order.cityId).
  // Pas de gate guilde — la ville du filler peut différer.
  const feeContext = await resolveMarketContext(order.cityId);
  await ensurePlayerBank(fillerId);

  const totalGold = quantity * order.pricePerUnit;
  const res       = order.resourceType as ResourceType;

  // Déterminer rôles
  const sellerId  = order.side === "sell" ? order.playerId : fillerId;
  const buyerId   = order.side === "sell" ? fillerId : order.playerId;
  const buyOrderId  = order.side === "buy"  ? order.id : 0;
  const sellOrderId = order.side === "sell" ? order.id : 0;

  const result = await db.transaction(async (tx) => {
    // 1. Si guilde présente sur la ville de l'ordre : promouvoir le fee pending
    //    puis relire. Si pas de guilde : feeBps fixe = 500 bps (5%).
    let feeBps = feeContext.feeBps;
    if (feeContext.hasGuild) {
      await promoteFeeLazy(order.cityId, tx);
      const [guild] = await tx.select().from(marketGuilds).where(eq(marketGuilds.cityId, order.cityId)).limit(1);
      feeBps = guild?.activeFeeBps ?? 0;
    }
    const feeAmount = Math.floor(totalGold * feeBps / 10000);
    const netSeller = totalGold - feeAmount;

    // 3. Mouvements selon side de l'ordre
    if (order.side === "sell") {
      // Filler = acheteur. Débite gold du filler.
      const ok = await debitGold(fillerId, totalGold, tx);
      if (!ok) throw Object.assign(new Error(`Or insuffisant pour le fill (${totalGold} or requis)`), { status: 422 });
      // Crédite ressource au filler (l'escrow de la ressource est déjà dans le void depuis placeOrder)
      await creditResource(fillerId, res, quantity, tx);
      // Crédite or net au vendeur
      await creditGoldPlayer(order.playerId, netSeller, tx);
    } else {
      // order.side === "buy". Filler = vendeur. Débite ressource du filler.
      const ok = await debitResource(fillerId, res, quantity, tx);
      if (!ok) throw Object.assign(new Error(`Ressources insuffisantes pour le fill (${quantity}× ${res})`), { status: 422 });
      // Crédite ressource à l'acheteur original (buyer = order.playerId)
      await creditResource(order.playerId, res, quantity, tx);
      // Or du buyer est déjà en escrow (déjà soustrait de player_bank à placeOrder)
      // Crédite or net au vendeur (filler)
      await creditGoldPlayer(fillerId, netSeller, tx);
    }

    // 4. Commission → propriétaire du marché
    if (feeAmount > 0) {
      const owner = await deriveMarketOwner(order.cityId);
      if (owner) {
        if (owner.ownerType === "player" && owner.ownerPlayerId) {
          await ensurePlayerBank(owner.ownerPlayerId, tx);
          await creditGoldPlayer(owner.ownerPlayerId, feeAmount, tx);
        } else if (owner.ownerType === "faction" && owner.ownerFactionId) {
          await tx
            .update(factionEconomy)
            .set({ gold: sql`${factionEconomy.gold} + ${feeAmount}`, updatedAt: new Date() })
            .where(eq(factionEconomy.factionId, owner.ownerFactionId));
        }
      }
    }

    // 5. Mise à jour de l'ordre
    const newRemaining = order.quantityRemaining - quantity;
    const newStatus    = newRemaining === 0 ? "filled" : "open";
    await tx
      .update(marketOrders)
      .set({ quantityRemaining: newRemaining, status: newStatus, updatedAt: new Date() })
      .where(eq(marketOrders.id, orderId));

    // 6. Enregistrement du trade
    // Pour buy/sell croisé, normaliser les IDs d'ordre
    const actualBuyOrderId  = order.side === "buy"  ? order.id : -1;
    const actualSellOrderId = order.side === "sell" ? order.id : -1;

    // Créer un ordre ghost si fill d'un ordre buy (le sellOrderId n'existe pas formellement)
    // Solution : on stocke 0 dans l'id inexistant et on utilise une contrainte relâchée via INSERT direct
    const [trade] = await tx
      .insert(marketTrades)
      .values({
        cityId:       order.cityId,
        buyOrderId:   actualBuyOrderId > 0  ? actualBuyOrderId  : order.id,
        sellOrderId:  actualSellOrderId > 0 ? actualSellOrderId : order.id,
        buyerId,
        sellerId,
        resourceType: res,
        quantity,
        pricePerUnit: order.pricePerUnit,
        totalGold,
        feeBpsApplied: feeBps,
        feeAmount,
      })
      .returning({ id: marketTrades.id });

    console.log(`[market] fillOrder orderId=${orderId} qty=${quantity} totalGold=${totalGold} fee=${feeAmount} tradeId=${trade.id}`);
    return { tradeId: trade.id, totalGold, feeAmount };
  });

  return result;
}

// ─── updateFee ────────────────────────────────────────────────────────────────
// Change la commission du marché. Owner canonique ou admin. Cooldown 24 h.
export async function updateFee(
  cityId:      number,
  newFeeBps:   number,
  requesterId: string,
  isAdmin:     boolean,
  requesterFactionId?: number,
): Promise<void> {
  // updateFee nécessite que la ville ait une guilde_des_marchands (logique de gestion locale).
  const context = await resolveMarketContext(cityId);
  if (!context.hasGuild)
    throw Object.assign(new Error("La modification de commission nécessite la Guilde des Marchands dans cette ville"), { status: 403 });

  const guild = context.guildRecord!;
  const cap   = TIER_CAPS[guild.tier] ?? 600;

  if (!Number.isInteger(newFeeBps) || newFeeBps < 0 || newFeeBps > cap)
    throw Object.assign(new Error(`Fee hors limites (0..${cap} bps pour tier ${guild.tier})`), { status: 400 });

  if (!isAdmin) {
    // Vérification ownership canonique
    const owner = await deriveMarketOwner(cityId);
    if (!owner) throw Object.assign(new Error("Ce marché n'a pas de propriétaire identifiable"), { status: 403 });

    const authorized =
      (owner.ownerType === "player" && owner.ownerPlayerId === requesterId) ||
      (owner.ownerType === "faction" && owner.ownerFactionId === requesterFactionId);

    if (!authorized)
      throw Object.assign(new Error("Seul le propriétaire du marché peut modifier la commission"), { status: 403 });

    // Cooldown 24 h
    if (guild.lastFeeChangeRequestedAt) {
      const elapsed = Date.now() - guild.lastFeeChangeRequestedAt.getTime();
      if (elapsed < COOLDOWN_MS) {
        const waitH = Math.ceil((COOLDOWN_MS - elapsed) / 3600000);
        throw Object.assign(new Error(`Cooldown actif — réessayez dans ~${waitH} h`), { status: 429 });
      }
    }
  }

  const now         = new Date();
  const appliesAt   = new Date(now.getTime() + COOLDOWN_MS);

  await db
    .update(marketGuilds)
    .set({
      pendingFeeBps:            newFeeBps,
      pendingFeeAppliesAt:      appliesAt,
      lastFeeChangeRequestedAt: now,
    })
    .where(eq(marketGuilds.cityId, cityId));

  console.log(`[market] updateFee cityId=${cityId} pending=${newFeeBps}bps appliesAt=${appliesAt.toISOString()}`);
}
