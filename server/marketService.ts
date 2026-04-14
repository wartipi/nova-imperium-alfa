import { db } from "./db";
import {
  marketGuilds, marketOrders, marketTrades, marketFeeBox,
  playerBank, playerTransport, playerMarketBox, factionEconomy, factionMembers,
  cityBuildings, cities, colonies,
} from "../shared/schema";
import { computeTransportUnits, TRANSPORT_MAX_UNITS } from "./playerActionService";
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
const COOLDOWN_MS = 10 * 1000; // 10 s (phase de test)

// ─── resolveMarketContext ─────────────────────────────────────────────────────
// Résout le contexte fee/guilde pour une ville donnée (helper interne).
// NE constitue PAS le gate d'accès au marché — c'est resolveAccessPoint()
// (accessPointService.ts) qui applique la règle réelle : présence physique du
// joueur sur une ville équipée de guilde_des_marchands, sinon 403.
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

// ─── hasBankBuilding ──────────────────────────────────────────────────────────
// Vérifie si la ville possède un bâtiment "bank" (source canonique : city_buildings).
async function hasBankBuilding(
  cityId: number,
  tx: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0],
): Promise<boolean> {
  const [row] = await (tx as typeof db)
    .select({ id: cityBuildings.id })
    .from(cityBuildings)
    .where(and(eq(cityBuildings.cityId, cityId), eq(cityBuildings.building, "bank")))
    .limit(1);
  return !!row;
}

// ─── ensureMarketFeeBox ────────────────────────────────────────────────────────
async function ensureMarketFeeBox(
  cityId: number,
  tx: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0],
): Promise<void> {
  await (tx as typeof db)
    .insert(marketFeeBox)
    .values({ cityId, gold: 0, updatedAt: new Date() })
    .onConflictDoNothing();
}

// ─── computeMarketFee ─────────────────────────────────────────────────────────
// Source de vérité unique pour le calcul de commission.
// Minimum 1 gold si commission non nulle ; 0 si feeBps ou totalGold <= 0.
function computeMarketFee(totalGold: number, feeBps: number): number {
  if (feeBps <= 0 || totalGold <= 0) return 0;
  const rawFee = totalGold * feeBps / 10000;
  return Math.max(1, Math.round(rawFee));
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
// Effectue la promotion lazy du fee pending → active si l'heure est passée,
// afin que l'affichage soit cohérent même sans trade récent.
export async function getMarketInfo(cityId: number) {
  const context = await resolveMarketContext(cityId);
  const owner   = await deriveMarketOwner(cityId);
  if (context.hasGuild) {
    await promoteFeeLazy(cityId, db);
    const [updated] = await db.select().from(marketGuilds)
      .where(eq(marketGuilds.cityId, cityId)).limit(1);
    return {
      guild:    updated ?? context.guildRecord,
      hasGuild: context.hasGuild,
      feeBps:   updated?.activeFeeBps ?? context.feeBps,
      owner,
    };
  }
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
function resourceCol(res: ResourceType): any {
  const map: Record<ResourceType, any> = {
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

// ─── Helpers ressource player_transport ──────────────────────────────────────
// Marché V1 transport-based, sans réservation de capacité.
// Overflow toléré pour ne pas bloquer escrow/cancel/fill.

function transportResourceCol(res: ResourceType): any {
  const map: Record<ResourceType, any> = {
    food:   playerTransport.food,
    wood:   playerTransport.wood,
    stone:  playerTransport.stone,
    iron:   playerTransport.iron,
    copper: playerTransport.copper,
    coal:   playerTransport.coal,
    oil:    playerTransport.oil,
    herbs:  playerTransport.herbs,
    fur:    playerTransport.fur,
  };
  return map[res];
}

async function ensurePlayerTransport(playerId: string, tx?: any) {
  const target = tx ?? db;
  await target
    .insert(playerTransport)
    .values({ playerId, gold: 0, food: 0, wood: 0, stone: 0, iron: 0,
              copper: 0, coal: 0, oil: 0, herbs: 0, fur: 0 })
    .onConflictDoNothing();
}

// Débite des ressources depuis le transport. Retourne false si insuffisant.
async function debitTransportResource(playerId: string, res: ResourceType, qty: number, tx?: any): Promise<boolean> {
  const target = tx ?? db;
  const col = transportResourceCol(res);
  const updated = await target
    .update(playerTransport)
    .set({ [res]: sql`${col} - ${qty}`, updatedAt: new Date() })
    .where(and(eq(playerTransport.playerId, playerId), sql`${col} >= ${qty}`))
    .returning({ val: col });
  return updated.length > 0;
}

// Crédite des ressources dans le transport.
async function creditTransportResource(playerId: string, res: ResourceType, qty: number, tx?: any): Promise<void> {
  const target = tx ?? db;
  const col = transportResourceCol(res);
  await target
    .update(playerTransport)
    .set({ [res]: sql`${col} + ${qty}`, updatedAt: new Date() })
    .where(eq(playerTransport.playerId, playerId));
}

// Débite de l'or du transport. Retourne false si insuffisant.
async function debitTransportGold(playerId: string, amount: number, tx?: any): Promise<boolean> {
  const target = tx ?? db;
  const updated = await target
    .update(playerTransport)
    .set({ gold: sql`${playerTransport.gold} - ${amount}`, updatedAt: new Date() })
    .where(and(eq(playerTransport.playerId, playerId), sql`${playerTransport.gold} >= ${amount}`))
    .returning({ gold: playerTransport.gold });
  return updated.length > 0;
}

// Crédite de l'or dans le transport.
async function creditTransportGold(playerId: string, amount: number, tx?: any): Promise<void> {
  if (amount <= 0) return;
  const target = tx ?? db;
  await target
    .update(playerTransport)
    .set({ gold: sql`${playerTransport.gold} + ${amount}`, updatedAt: new Date() })
    .where(eq(playerTransport.playerId, playerId));
}

// ─── Helpers player_market_box ───────────────────────────────────────────────
// Boîte de règlement — reçoit fills et annulations. Sans capacité.

async function ensurePlayerMarketBox(playerId: string, tx?: any) {
  const target = tx ?? db;
  await target
    .insert(playerMarketBox)
    .values({ playerId, gold: 0, food: 0, wood: 0, stone: 0, iron: 0,
              copper: 0, coal: 0, oil: 0, herbs: 0, fur: 0 })
    .onConflictDoNothing();
}

async function creditMarketBoxGold(playerId: string, amount: number, tx?: any): Promise<void> {
  if (amount <= 0) return;
  const target = tx ?? db;
  await target
    .update(playerMarketBox)
    .set({ gold: sql`${playerMarketBox.gold} + ${amount}`, updatedAt: new Date() })
    .where(eq(playerMarketBox.playerId, playerId));
}

function marketBoxResourceCol(res: ResourceType): any {
  const map: Record<ResourceType, any> = {
    food:   playerMarketBox.food,
    wood:   playerMarketBox.wood,
    stone:  playerMarketBox.stone,
    iron:   playerMarketBox.iron,
    copper: playerMarketBox.copper,
    coal:   playerMarketBox.coal,
    oil:    playerMarketBox.oil,
    herbs:  playerMarketBox.herbs,
    fur:    playerMarketBox.fur,
  };
  return map[res];
}

async function creditMarketBoxResource(playerId: string, res: ResourceType, qty: number, tx?: any): Promise<void> {
  const target = tx ?? db;
  const col = marketBoxResourceCol(res);
  await target
    .update(playerMarketBox)
    .set({ [res]: sql`${col} + ${qty}`, updatedAt: new Date() })
    .where(eq(playerMarketBox.playerId, playerId));
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
  // Escrow prélevé du transport (marché V1 transport-based).
  await ensurePlayerTransport(playerId);

  const res = resourceType as ResourceType;

  // Escrow depuis player_transport
  if (side === "sell") {
    const ok = await debitTransportResource(playerId, res, quantity);
    if (!ok) throw Object.assign(new Error(`Ressources insuffisantes dans le transport pour l'escrow (${quantity}× ${res})`), { status: 422 });
  } else {
    const totalGold = quantity * pricePerUnit;
    const ok = await debitTransportGold(playerId, totalGold);
    if (!ok) throw Object.assign(new Error(`Or insuffisant dans le transport pour l'escrow (${totalGold} or requis)`), { status: 422 });
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

  // Retour escrow résiduel vers player_market_box (jamais vers transport directement).
  await ensurePlayerMarketBox(order.playerId);
  if (order.side === "sell") {
    await creditMarketBoxResource(order.playerId, order.resourceType as ResourceType, order.quantityRemaining);
  } else {
    const goldBack = order.quantityRemaining * order.pricePerUnit;
    await creditMarketBoxGold(order.playerId, goldBack);
  }

  await db
    .update(marketOrders)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(marketOrders.id, orderId));

  console.log(`[market] cancelOrder orderId=${orderId} escrow retourné dans la boîte de règlement`);
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
  // S'assurer que le filler a bien une ligne transport (marché V1 transport-based).
  await ensurePlayerTransport(fillerId);

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
    const feeAmount = computeMarketFee(totalGold, feeBps);
    const netSeller = totalGold - feeAmount;

    // 3. Mouvements buyer/seller
    // Débits escrow : toujours depuis transport (inchangé).
    // Crédits résultats : vers player_market_box (jamais vers transport directement).
    if (order.side === "sell") {
      // Filler = acheteur. Débite or du filler depuis transport.
      const ok = await debitTransportGold(fillerId, totalGold, tx);
      if (!ok) throw Object.assign(new Error(`Or insuffisant dans le transport pour le fill (${totalGold} or requis)`), { status: 422 });
      // Acheteur (filler) reçoit la ressource dans sa boîte de règlement.
      await ensurePlayerMarketBox(fillerId, tx);
      await creditMarketBoxResource(fillerId, res, quantity, tx);
      // Vendeur (order.playerId) reçoit l'or net dans sa boîte de règlement.
      await ensurePlayerMarketBox(order.playerId, tx);
      await creditMarketBoxGold(order.playerId, netSeller, tx);
    } else {
      // order.side === "buy". Filler = vendeur. Débite ressource du filler depuis transport.
      const ok = await debitTransportResource(fillerId, res, quantity, tx);
      if (!ok) throw Object.assign(new Error(`Ressources insuffisantes dans le transport pour le fill (${quantity}× ${res})`), { status: 422 });
      // Acheteur original (order.playerId) reçoit la ressource dans sa boîte de règlement.
      await ensurePlayerMarketBox(order.playerId, tx);
      await creditMarketBoxResource(order.playerId, res, quantity, tx);
      // Or du buyer déjà en escrow (soustrait du transport à placeOrder).
      // Vendeur (filler) reçoit l'or net dans sa boîte de règlement.
      await ensurePlayerMarketBox(fillerId, tx);
      await creditMarketBoxGold(fillerId, netSeller, tx);
    }

    // 4. Commission → propriétaire du marché ou caisse locale selon présence banque.
    if (feeAmount > 0) {
      const hasBank = await hasBankBuilding(order.cityId, tx);
      if (hasBank) {
        // Ville avec banque : transfert immédiat vers le compte propriétaire.
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
      } else {
        // Ville sans banque : commission stockée dans la caisse locale du marché.
        await ensureMarketFeeBox(order.cityId, tx);
        await (tx as typeof db)
          .update(marketFeeBox)
          .set({ gold: sql`${marketFeeBox.gold} + ${feeAmount}`, updatedAt: new Date() })
          .where(eq(marketFeeBox.cityId, order.cityId));
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

    // Cooldown 10 s (phase de test)
    if (guild.lastFeeChangeRequestedAt) {
      const elapsed = Date.now() - guild.lastFeeChangeRequestedAt.getTime();
      if (elapsed < COOLDOWN_MS) {
        const waitS = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
        throw Object.assign(new Error(`Cooldown actif — réessayez dans ~${waitS} s`), { status: 429 });
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

// ─── getMarketBox ─────────────────────────────────────────────────────────────
// Retourne le contenu actuel de la boîte de règlement du joueur.
// Crée la ligne lazily si absente.
export async function getMarketBox(playerId: string) {
  await ensurePlayerMarketBox(playerId);
  const [row] = await db
    .select()
    .from(playerMarketBox)
    .where(eq(playerMarketBox.playerId, playerId))
    .limit(1);
  return row;
}

// ─── claimMarketBoxToTransport ────────────────────────────────────────────────
// Transfère tout le contenu de la boîte vers le transport du joueur.
// Vérifie la capacité : refuse si le transport serait dépassé.
export async function claimMarketBoxToTransport(playerId: string): Promise<{ ok: true }> {
  await ensurePlayerMarketBox(playerId);
  await ensurePlayerTransport(playerId);

  const [box] = await db
    .select()
    .from(playerMarketBox)
    .where(eq(playerMarketBox.playerId, playerId))
    .limit(1);

  if (!box) throw Object.assign(new Error("Boîte introuvable"), { status: 500 });

  // Vérifier qu'il y a quelque chose à récupérer
  const hasContent = box.gold > 0 || box.food > 0 || box.wood > 0 || box.stone > 0
    || box.iron > 0 || box.copper > 0 || box.coal > 0 || box.oil > 0
    || box.herbs > 0 || box.fur > 0;
  if (!hasContent) throw Object.assign(new Error("Boîte de règlement vide"), { status: 400 });

  // Lire transport actuel pour vérifier la capacité
  const [transport] = await db
    .select()
    .from(playerTransport)
    .where(eq(playerTransport.playerId, playerId))
    .limit(1);

  const current = transport ?? { gold: 0, food: 0, wood: 0, stone: 0, iron: 0, copper: 0, coal: 0, oil: 0, herbs: 0, fur: 0 };
  const usedNow = computeTransportUnits({
    gold: current.gold, food: current.food, wood: current.wood, stone: current.stone,
    iron: current.iron, copper: current.copper, coal: current.coal, oil: current.oil,
    herbs: current.herbs, fur: current.fur,
  });
  const toAdd = computeTransportUnits({
    gold: box.gold, food: box.food, wood: box.wood, stone: box.stone,
    iron: box.iron, copper: box.copper, coal: box.coal, oil: box.oil,
    herbs: box.herbs, fur: box.fur,
  });

  if (usedNow + toAdd > TRANSPORT_MAX_UNITS) {
    throw Object.assign(
      new Error(`Capacité transport insuffisante : ${usedNow} + ${toAdd} > ${TRANSPORT_MAX_UNITS} unités`),
      { status: 422 }
    );
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    // Créditer transport
    await tx
      .update(playerTransport)
      .set({
        gold:      sql`${playerTransport.gold}   + ${box.gold}`,
        food:      sql`${playerTransport.food}   + ${box.food}`,
        wood:      sql`${playerTransport.wood}   + ${box.wood}`,
        stone:     sql`${playerTransport.stone}  + ${box.stone}`,
        iron:      sql`${playerTransport.iron}   + ${box.iron}`,
        copper:    sql`${playerTransport.copper} + ${box.copper}`,
        coal:      sql`${playerTransport.coal}   + ${box.coal}`,
        oil:       sql`${playerTransport.oil}    + ${box.oil}`,
        herbs:     sql`${playerTransport.herbs}  + ${box.herbs}`,
        fur:       sql`${playerTransport.fur}    + ${box.fur}`,
        updatedAt: now,
      })
      .where(eq(playerTransport.playerId, playerId));

    // Vider la boîte
    await tx
      .update(playerMarketBox)
      .set({ gold: 0, food: 0, wood: 0, stone: 0, iron: 0,
             copper: 0, coal: 0, oil: 0, herbs: 0, fur: 0, updatedAt: now })
      .where(eq(playerMarketBox.playerId, playerId));
  });

  console.log(`[market] claimToTransport player=${playerId} +${toAdd}u (gold=${box.gold})`);
  return { ok: true };
}

// ─── claimMarketBoxToBank ──────────────────────────────────────────────────────
// Transfère tout le contenu de la boîte vers la banque du joueur.
// Pas de check de capacité transport.
export async function claimMarketBoxToBank(playerId: string): Promise<{ ok: true }> {
  await ensurePlayerMarketBox(playerId);
  await ensurePlayerBank(playerId);

  const [box] = await db
    .select()
    .from(playerMarketBox)
    .where(eq(playerMarketBox.playerId, playerId))
    .limit(1);

  if (!box) throw Object.assign(new Error("Boîte introuvable"), { status: 500 });

  const hasContent = box.gold > 0 || box.food > 0 || box.wood > 0 || box.stone > 0
    || box.iron > 0 || box.copper > 0 || box.coal > 0 || box.oil > 0
    || box.herbs > 0 || box.fur > 0;
  if (!hasContent) throw Object.assign(new Error("Boîte de règlement vide"), { status: 400 });

  const now = new Date();
  await db.transaction(async (tx) => {
    // Créditer banque
    await tx
      .update(playerBank)
      .set({
        gold:      sql`${playerBank.gold}   + ${box.gold}`,
        food:      sql`${playerBank.food}   + ${box.food}`,
        wood:      sql`${playerBank.wood}   + ${box.wood}`,
        stone:     sql`${playerBank.stone}  + ${box.stone}`,
        iron:      sql`${playerBank.iron}   + ${box.iron}`,
        copper:    sql`${playerBank.copper} + ${box.copper}`,
        coal:      sql`${playerBank.coal}   + ${box.coal}`,
        oil:       sql`${playerBank.oil}    + ${box.oil}`,
        herbs:     sql`${playerBank.herbs}  + ${box.herbs}`,
        fur:       sql`${playerBank.fur}    + ${box.fur}`,
        updatedAt: now,
      })
      .where(eq(playerBank.playerId, playerId));

    // Vider la boîte
    await tx
      .update(playerMarketBox)
      .set({ gold: 0, food: 0, wood: 0, stone: 0, iron: 0,
             copper: 0, coal: 0, oil: 0, herbs: 0, fur: 0, updatedAt: now })
      .where(eq(playerMarketBox.playerId, playerId));
  });

  console.log(`[market] claimToBank player=${playerId} or=${box.gold}`);
  return { ok: true };
}

// ─── getFeeBox ────────────────────────────────────────────────────────────────
// Lit la caisse locale de commission d'un marché (cityId).
// Retourne { gold: 0 } si aucune caisse n'existe encore.
export async function getFeeBox(cityId: number): Promise<{ gold: number }> {
  const [row] = await db
    .select({ gold: marketFeeBox.gold })
    .from(marketFeeBox)
    .where(eq(marketFeeBox.cityId, cityId))
    .limit(1);
  return { gold: row?.gold ?? 0 };
}

// ─── collectFeeBox ────────────────────────────────────────────────────────────
// Collecte la caisse locale et transfère l'or vers le compte propriétaire.
// Autorisé : propriétaire du marché (player ou faction leader) ou admin.
export async function collectFeeBox(
  cityId:    number,
  requesterId: string,
  isAdmin:   boolean,
): Promise<{ collected: number }> {
  const [row] = await db
    .select({ gold: marketFeeBox.gold })
    .from(marketFeeBox)
    .where(eq(marketFeeBox.cityId, cityId))
    .limit(1);

  const gold = row?.gold ?? 0;
  if (gold <= 0) throw Object.assign(new Error("Caisse locale vide"), { status: 400 });

  const owner = await deriveMarketOwner(cityId);

  // Vérification ownership ou admin
  if (!isAdmin) {
    const isOwnerPlayer  = owner?.ownerType === "player"  && owner.ownerPlayerId  === requesterId;
    const isOwnerFaction = owner?.ownerType === "faction" && owner.ownerFactionId != null;
    if (isOwnerFaction) {
      // Simplification V1 : tout membre de la faction propriétaire peut collecter.
      const [mem] = await db
        .select({ factionId: factionMembers.factionId })
        .from(factionMembers)
        .where(eq(factionMembers.playerId, requesterId))
        .limit(1);
      if (!mem || mem.factionId !== owner!.ownerFactionId) {
        throw Object.assign(new Error("Accès refusé — vous n'êtes pas propriétaire de ce marché"), { status: 403 });
      }
    } else if (!isOwnerPlayer) {
      throw Object.assign(new Error("Accès refusé — vous n'êtes pas propriétaire de ce marché"), { status: 403 });
    }
  }

  await db.transaction(async (tx) => {
    // Vider la caisse
    await tx
      .update(marketFeeBox)
      .set({ gold: 0, updatedAt: new Date() })
      .where(eq(marketFeeBox.cityId, cityId));

    // Transférer vers le compte propriétaire
    if (owner) {
      if (owner.ownerType === "player" && owner.ownerPlayerId) {
        await ensurePlayerBank(owner.ownerPlayerId, tx);
        await creditGoldPlayer(owner.ownerPlayerId, gold, tx);
      } else if (owner.ownerType === "faction" && owner.ownerFactionId) {
        await tx
          .update(factionEconomy)
          .set({ gold: sql`${factionEconomy.gold} + ${gold}`, updatedAt: new Date() })
          .where(eq(factionEconomy.factionId, owner.ownerFactionId));
      }
    }
  });

  console.log(`[market] collectFeeBox cityId=${cityId} requester=${requesterId} collected=${gold}`);
  return { collected: gold };
}
