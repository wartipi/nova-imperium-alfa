import { eq, and, or, lt, gt } from "drizzle-orm";
import { jsonbContainsArray } from "./utils/jsonbQueries";
import { db } from "./db";
import { 
  tradeRooms, 
  exchangeOffers, 
  uniqueItems,
  playerResources 
} from "../shared/schema";
import type { 
  TradeRoom, 
  ExchangeOffer, 
  UniqueItem,
  InsertTradeRoom,
  InsertExchangeOffer,
  InsertUniqueItem
} from "../shared/schema";

class ExchangeService {
  private subscribers: Map<string, Array<(data: any) => void>> = new Map();

  async createTradeRoom(treatyId: string, participants: string[]): Promise<TradeRoom> {
    const id = `trade_${treatyId}_${Date.now()}`;
    
    const [room] = await db.insert(tradeRooms).values({
      id,
      participants,
      treatyId,
      isActive: true,
      createdAt: new Date()
    }).returning();

    participants.forEach(playerId => {
      this.notifySubscribers(playerId, {
        type: 'room_created',
        room
      });
    });

    return room;
  }

  async createUniqueItem(
    name: string,
    type: string,
    rarity: string,
    description: string,
    ownerId: string,
    effects?: string[],
    requirements?: string[],
    value: number = 100,
    metadata?: Record<string, any>
  ): Promise<UniqueItem> {
    const id = `item_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    const [item] = await db.insert(uniqueItems).values({
      id,
      name,
      type,
      rarity,
      description,
      effects: effects || [],
      requirements: requirements || [],
      value,
      tradeable: true,
      ownerId,
      metadata: metadata || null,
      createdAt: new Date()
    }).returning();

    return item;
  }

  async createExchangeOffer(
    roomId: string | null,
    fromPlayer: string,
    toPlayer: string,
    resourcesOffered: Record<string, number>,
    resourcesRequested: Record<string, number>,
    itemsOffered: string[] = [],
    itemsRequested: string[] = [],
    message?: string
  ): Promise<ExchangeOffer | null> {
    if (roomId) {
      const [room] = await db.select().from(tradeRooms)
        .where(eq(tradeRooms.id, roomId));
      
      if (!room || !room.isActive) return null;

      const participants = room.participants as string[];
      if (!participants.includes(fromPlayer) || !participants.includes(toPlayer)) {
        return null;
      }
    }

    for (const itemId of itemsOffered) {
      const [item] = await db.select().from(uniqueItems)
        .where(eq(uniqueItems.id, itemId));
      
      if (!item || item.ownerId !== fromPlayer || !item.tradeable) {
        return null;
      }
    }

    const hasResources = Object.keys(resourcesOffered).length > 0 || Object.keys(resourcesRequested).length > 0;
    const hasItems = itemsOffered.length > 0 || itemsRequested.length > 0;
    
    let offerType: string;
    if (hasResources && hasItems) {
      offerType = 'mixed';
    } else if (hasItems) {
      offerType = 'unique_items';
    } else {
      offerType = 'resources';
    }

    const id = `offer_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const [offer] = await db.insert(exchangeOffers).values({
      id,
      roomId,
      fromPlayer,
      toPlayer,
      resourcesOffered,
      resourcesRequested,
      itemsOffered,
      itemsRequested,
      status: 'pending',
      offerType,
      message: message || null,
      createdAt: new Date(),
      expiresAt
    }).returning();

    this.notifySubscribers(toPlayer, { type: 'offer_received', offer });
    this.notifySubscribers(fromPlayer, { type: 'offer_sent', offer });

    return offer;
  }

  async acceptOffer(offerId: string, playerId: string): Promise<boolean> {
    const [offer] = await db.select().from(exchangeOffers)
      .where(eq(exchangeOffers.id, offerId));
    
    if (!offer || offer.status !== 'pending' || offer.toPlayer !== playerId) {
      return false;
    }

    if (new Date() > offer.expiresAt) {
      await db.update(exchangeOffers)
        .set({ status: 'expired' })
        .where(eq(exchangeOffers.id, offerId));
      return false;
    }

    try {
      await this.executeExchange(offer);
      
      await db.update(exchangeOffers)
        .set({ status: 'accepted' })
        .where(eq(exchangeOffers.id, offerId));

      this.notifySubscribers(offer.fromPlayer, { type: 'offer_accepted', offer });
      this.notifySubscribers(offer.toPlayer, { type: 'offer_accepted', offer });

      return true;
    } catch (error) {
      console.error(`Échec de l'échange: ${error}`);
      this.notifySubscribers(offer.fromPlayer, { type: 'offer_failed', offer, error: String(error) });
      this.notifySubscribers(offer.toPlayer, { type: 'offer_failed', offer, error: String(error) });
      return false;
    }
  }

  async rejectOffer(offerId: string, playerId: string): Promise<boolean> {
    const [offer] = await db.select().from(exchangeOffers)
      .where(eq(exchangeOffers.id, offerId));
    
    if (!offer || offer.status !== 'pending' || offer.toPlayer !== playerId) {
      return false;
    }

    await db.update(exchangeOffers)
      .set({ status: 'rejected' })
      .where(eq(exchangeOffers.id, offerId));

    this.notifySubscribers(offer.fromPlayer, { type: 'offer_rejected', offer });
    this.notifySubscribers(offer.toPlayer, { type: 'offer_rejected', offer });

    return true;
  }

  private async executeExchange(offer: ExchangeOffer): Promise<void> {
    console.log(`Échange exécuté entre ${offer.fromPlayer} et ${offer.toPlayer}`);
    
    const resourcesOffered = offer.resourcesOffered as Record<string, number>;
    const resourcesRequested = offer.resourcesRequested as Record<string, number>;
    const itemsOffered = offer.itemsOffered as string[];
    const itemsRequested = offer.itemsRequested as string[];

    await db.transaction(async (tx) => {
      for (const [resource, amount] of Object.entries(resourcesOffered)) {
        await this.transferResourcesInTx(tx, offer.fromPlayer, offer.toPlayer, resource, amount);
        console.log(`Transfert: ${amount} ${resource} de ${offer.fromPlayer} vers ${offer.toPlayer}`);
      }

      for (const [resource, amount] of Object.entries(resourcesRequested)) {
        await this.transferResourcesInTx(tx, offer.toPlayer, offer.fromPlayer, resource, amount);
        console.log(`Transfert: ${amount} ${resource} de ${offer.toPlayer} vers ${offer.fromPlayer}`);
      }

      for (const itemId of itemsOffered) {
        await this.transferUniqueItemInTx(tx, itemId, offer.fromPlayer, offer.toPlayer);
      }

      for (const itemId of itemsRequested) {
        await this.transferUniqueItemInTx(tx, itemId, offer.toPlayer, offer.fromPlayer);
      }
    });
  }

  private async transferResourcesInTx(tx: any, fromPlayer: string, toPlayer: string, resourceType: string, amount: number): Promise<void> {
    const [fromResource] = await tx.select().from(playerResources)
      .where(and(
        eq(playerResources.playerId, fromPlayer),
        eq(playerResources.resourceType, resourceType)
      ));

    if (!fromResource || fromResource.quantity < amount) {
      throw new Error(`Ressources insuffisantes: ${fromPlayer} n'a pas ${amount} ${resourceType}`);
    }

    await tx.update(playerResources)
      .set({ 
        quantity: fromResource.quantity - amount,
        updatedAt: new Date()
      })
      .where(eq(playerResources.id, fromResource.id));

    const [toResource] = await tx.select().from(playerResources)
      .where(and(
        eq(playerResources.playerId, toPlayer),
        eq(playerResources.resourceType, resourceType)
      ));

    if (toResource) {
      await tx.update(playerResources)
        .set({ 
          quantity: toResource.quantity + amount,
          updatedAt: new Date()
        })
        .where(eq(playerResources.id, toResource.id));
    } else {
      const id = `resource_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      await tx.insert(playerResources).values({
        id,
        playerId: toPlayer,
        resourceType,
        quantity: amount,
        updatedAt: new Date()
      });
    }
  }

  private async transferUniqueItemInTx(tx: any, itemId: string, fromPlayer: string, toPlayer: string): Promise<void> {
    const [item] = await tx.select().from(uniqueItems)
      .where(eq(uniqueItems.id, itemId));
    
    if (!item || item.ownerId !== fromPlayer || !item.tradeable) {
      throw new Error(`Objet ${itemId} non transférable par ${fromPlayer}`);
    }

    await tx.update(uniqueItems)
      .set({ ownerId: toPlayer })
      .where(eq(uniqueItems.id, itemId));

    console.log(`Transfert objet unique: ${item.name} de ${fromPlayer} vers ${toPlayer}`);
  }

  async getPlayerResources(playerId: string): Promise<Record<string, number>> {
    const resources = await db.select().from(playerResources)
      .where(eq(playerResources.playerId, playerId));
    
    const result: Record<string, number> = {};
    for (const r of resources) {
      result[r.resourceType] = r.quantity;
    }
    return result;
  }

  async setPlayerResource(playerId: string, resourceType: string, quantity: number): Promise<void> {
    const [existing] = await db.select().from(playerResources)
      .where(and(
        eq(playerResources.playerId, playerId),
        eq(playerResources.resourceType, resourceType)
      ));

    if (existing) {
      await db.update(playerResources)
        .set({ quantity, updatedAt: new Date() })
        .where(eq(playerResources.id, existing.id));
    } else {
      const id = `resource_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      await db.insert(playerResources).values({
        id,
        playerId,
        resourceType,
        quantity,
        updatedAt: new Date()
      });
    }
  }

  private async transferUniqueItem(itemId: string, fromPlayer: string, toPlayer: string): Promise<boolean> {
    const [item] = await db.select().from(uniqueItems)
      .where(eq(uniqueItems.id, itemId));
    
    if (!item || item.ownerId !== fromPlayer || !item.tradeable) {
      return false;
    }

    await db.update(uniqueItems)
      .set({ ownerId: toPlayer })
      .where(eq(uniqueItems.id, itemId));

    console.log(`Transfert objet unique: ${item.name} de ${fromPlayer} vers ${toPlayer}`);
    return true;
  }

  async getTradeRoomsForPlayer(playerId: string): Promise<TradeRoom[]> {
    return await db.select().from(tradeRooms)
      .where(and(
        eq(tradeRooms.isActive, true),
        jsonbContainsArray(tradeRooms.participants, playerId)
      ));
  }

  async getActiveOffersForPlayer(playerId: string): Promise<ExchangeOffer[]> {
    const now = new Date();
    
    return await db.select().from(exchangeOffers)
      .where(and(
        or(
          eq(exchangeOffers.fromPlayer, playerId),
          eq(exchangeOffers.toPlayer, playerId)
        ),
        eq(exchangeOffers.status, 'pending'),
        gt(exchangeOffers.expiresAt, now)
      ));
  }

  async getPlayerInventory(playerId: string): Promise<UniqueItem[]> {
    return await db.select().from(uniqueItems)
      .where(eq(uniqueItems.ownerId, playerId));
  }

  async getUniqueItem(itemId: string): Promise<UniqueItem | null> {
    const [item] = await db.select().from(uniqueItems)
      .where(eq(uniqueItems.id, itemId));
    return item || null;
  }

  async getUniqueItemById(itemId: string): Promise<UniqueItem | null> {
    return this.getUniqueItem(itemId);
  }

  async clearPlayerInventory(playerId: string): Promise<boolean> {
    try {
      await db.delete(uniqueItems)
        .where(eq(uniqueItems.ownerId, playerId));
      return true;
    } catch (error) {
      console.error('Erreur lors du vidage de l\'inventaire:', error);
      return false;
    }
  }

  async closeTradeRoom(roomId: string): Promise<boolean> {
    const [room] = await db.select().from(tradeRooms)
      .where(eq(tradeRooms.id, roomId));
    
    if (!room) return false;

    await db.update(tradeRooms)
      .set({ isActive: false })
      .where(eq(tradeRooms.id, roomId));

    const participants = room.participants as string[];
    participants.forEach(playerId => {
      this.notifySubscribers(playerId, {
        type: 'room_closed',
        roomId
      });
    });

    return true;
  }

  async cleanupExpiredOffers(): Promise<void> {
    const now = new Date();
    
    const expiredOffers = await db.select().from(exchangeOffers)
      .where(and(
        eq(exchangeOffers.status, 'pending'),
        lt(exchangeOffers.expiresAt, now)
      ));

    for (const offer of expiredOffers) {
      await db.update(exchangeOffers)
        .set({ status: 'expired' })
        .where(eq(exchangeOffers.id, offer.id));

      this.notifySubscribers(offer.fromPlayer, { type: 'offer_expired', offer });
      this.notifySubscribers(offer.toPlayer, { type: 'offer_expired', offer });
    }
  }

  subscribe(playerId: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(playerId)) {
      this.subscribers.set(playerId, []);
    }

    this.subscribers.get(playerId)!.push(callback);

    (async () => {
      const tradeRooms = await this.getTradeRoomsForPlayer(playerId);
      const activeOffers = await this.getActiveOffersForPlayer(playerId);
      
      callback({
        type: 'initial_state',
        tradeRooms,
        activeOffers
      });
    })();

    return () => {
      const callbacks = this.subscribers.get(playerId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  private notifySubscribers(playerId: string, data: any): void {
    const callbacks = this.subscribers.get(playerId);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
}

export const exchangeService = new ExchangeService();

setInterval(() => {
  exchangeService.cleanupExpiredOffers();
}, 60000);

export { UniqueItem };
