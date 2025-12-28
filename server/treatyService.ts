import { eq, and, or, sql, inArray, gte, lt } from "drizzle-orm";
import { db } from "./db";
import { treaties } from "../shared/schema";
import type { Treaty } from "../shared/schema";

export type TreatyType = 
  | 'alliance_militaire'
  | 'accord_commercial' 
  | 'pacte_non_agression'
  | 'acces_militaire'
  | 'echange_ressources'
  | 'defense_mutuelle';

interface TreatyProperties {
  alliance_militaire?: {
    mutualDefense: boolean;
    sharedIntelligence: boolean;
    jointOperations: boolean;
    resourceSharing: number;
    militarySupport: 'full' | 'partial' | 'emergency_only';
  };
  
  accord_commercial?: {
    tradeRoutes: boolean;
    tariffsReduction: number;
    exclusiveDeals: boolean;
    resourcePriority: string[];
    goldBonus: number;
  };
  
  pacte_non_agression?: {
    duration: number;
    neutralZones: { x: number; y: number }[];
    tradingAllowed: boolean;
  };
  
  acces_militaire?: {
    unitsAllowed: string[];
    territoryAccess: boolean;
    timeLimit: number;
    restrictedZones: { x: number; y: number }[];
  };
  
  echange_ressources?: {
    resourcesOffered: { [key: string]: number };
    resourcesRequested: { [key: string]: number };
    uniqueItemsOffered: string[];
    uniqueItemsRequested: string[];
    deliverySchedule: 'immediate' | 'monthly' | 'quarterly';
    duration: number;
    penalties: number;
    realTimeExchange: boolean;
  };
  
  defense_mutuelle?: {
    responseTime: number;
    supportLevel: 'troops' | 'resources' | 'both';
    sharedTerritories: boolean;
    emergencyContact: boolean;
  };
}

class TreatyService {
  private subscribers: Map<string, Array<(treaties: Treaty[]) => void>> = new Map();

  private calculateTreatyCost(type: TreatyType): number {
    const costs: Record<TreatyType, number> = {
      alliance_militaire: 25,
      accord_commercial: 15,
      pacte_non_agression: 10,
      acces_militaire: 8,
      echange_ressources: 12,
      defense_mutuelle: 20
    };
    return costs[type] || 15;
  }

  async createTreaty(treaty: {
    title: string;
    type: TreatyType;
    parties: string[];
    terms: string;
    createdBy: string;
    expiresAt?: Date;
    properties: TreatyProperties;
  }): Promise<Treaty> {
    const id = `treaty_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const actionPointsCost = this.calculateTreatyCost(treaty.type);
    
    const [newTreaty] = await db.insert(treaties).values({
      id,
      title: treaty.title,
      type: treaty.type,
      parties: treaty.parties,
      terms: treaty.terms,
      status: 'proposed',
      createdBy: treaty.createdBy,
      createdAt: new Date(),
      expiresAt: treaty.expiresAt || null,
      signatures: [{
        playerId: treaty.createdBy,
        signedAt: Date.now()
      }],
      properties: treaty.properties,
      actionPointsCost
    }).returning();

    treaty.parties.forEach(playerId => {
      this.notifySubscribers(playerId);
    });
    
    console.log(`📜 Nouveau traité créé: ${newTreaty.title}`);
    return newTreaty;
  }

  async getTreatiesForPlayer(playerId: string): Promise<Treaty[]> {
    return await db.select().from(treaties)
      .where(sql`${treaties.parties}::jsonb @> ${JSON.stringify([playerId])}::jsonb`);
  }

  async getTreatyById(treatyId: string): Promise<Treaty | null> {
    const [treaty] = await db.select().from(treaties)
      .where(eq(treaties.id, treatyId));
    return treaty || null;
  }

  async signTreaty(treatyId: string, playerId: string): Promise<boolean> {
    const treaty = await this.getTreatyById(treatyId);
    
    if (!treaty) return false;
    if (treaty.status !== 'proposed') return false;
    
    const parties = treaty.parties as string[];
    if (!parties.includes(playerId)) return false;
    
    const signatures = treaty.signatures as { playerId: string; signedAt: number }[];
    const alreadySigned = signatures.some(sig => sig.playerId === playerId);
    if (alreadySigned) return false;
    
    const newSignatures = [...signatures, {
      playerId,
      signedAt: Date.now()
    }];
    
    const allSigned = parties.every(partyId => 
      newSignatures.some(sig => sig.playerId === partyId)
    );
    
    const newStatus = allSigned ? 'active' : 'proposed';
    
    await db.update(treaties)
      .set({ 
        signatures: newSignatures,
        status: newStatus
      })
      .where(eq(treaties.id, treatyId));
    
    if (allSigned) {
      this.activateTreatyEffects({ ...treaty, status: 'active' });
    }
    
    parties.forEach(participantId => {
      this.notifySubscribers(participantId);
    });
    
    return true;
  }

  async breakTreaty(treatyId: string, playerId: string): Promise<boolean> {
    const treaty = await this.getTreatyById(treatyId);
    
    if (!treaty) return false;
    if (treaty.status !== 'active') return false;
    
    const parties = treaty.parties as string[];
    if (!parties.includes(playerId)) return false;
    
    await db.update(treaties)
      .set({ status: 'broken' })
      .where(eq(treaties.id, treatyId));
    
    parties.forEach(participantId => {
      this.notifySubscribers(participantId);
    });
    
    return true;
  }

  async expireTreaty(treatyId: string): Promise<boolean> {
    const treaty = await this.getTreatyById(treatyId);
    
    if (!treaty) return false;
    if (treaty.status !== 'active') return false;
    
    await db.update(treaties)
      .set({ status: 'expired' })
      .where(eq(treaties.id, treatyId));
    
    const parties = treaty.parties as string[];
    parties.forEach(participantId => {
      this.notifySubscribers(participantId);
    });
    
    return true;
  }

  subscribe(playerId: string, callback: (treaties: Treaty[]) => void): () => void {
    if (!this.subscribers.has(playerId)) {
      this.subscribers.set(playerId, []);
    }
    
    this.subscribers.get(playerId)!.push(callback);
    
    (async () => {
      const playerTreaties = await this.getTreatiesForPlayer(playerId);
      callback(playerTreaties);
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

  private async notifySubscribers(playerId: string): Promise<void> {
    const callbacks = this.subscribers.get(playerId);
    if (callbacks) {
      const playerTreaties = await this.getTreatiesForPlayer(playerId);
      callbacks.forEach(callback => callback(playerTreaties));
    }
  }

  private activateTreatyEffects(treaty: Treaty): void {
    const type = treaty.type as TreatyType;
    const parties = treaty.parties as string[];
    const properties = treaty.properties as TreatyProperties;
    
    switch (type) {
      case 'alliance_militaire':
        console.log(`Alliance militaire activée entre ${parties.join(', ')}`);
        break;
      case 'accord_commercial':
        console.log(`Accord commercial activé entre ${parties.join(', ')}`);
        break;
      case 'pacte_non_agression':
        console.log(`Pacte de non-agression activé entre ${parties.join(', ')}`);
        break;
      case 'acces_militaire':
        console.log(`Accès militaire activé entre ${parties.join(', ')}`);
        break;
      case 'echange_ressources':
        console.log(`Échange de ressources activé entre ${parties.join(', ')}`);
        break;
      case 'defense_mutuelle':
        console.log(`Défense mutuelle activée entre ${parties.join(', ')}`);
        break;
    }
  }

  getTreatyTypes(): Array<{
    type: TreatyType;
    name: string;
    description: string;
    cost: number;
    icon: string;
  }> {
    return [
      {
        type: 'alliance_militaire',
        name: 'Alliance Militaire',
        description: 'Défense mutuelle, partage de renseignements, opérations conjointes',
        cost: 25,
        icon: '⚔️'
      },
      {
        type: 'accord_commercial',
        name: 'Accord Commercial',
        description: 'Routes commerciales, réduction des tarifs, bonus économiques',
        cost: 15,
        icon: '💰'
      },
      {
        type: 'pacte_non_agression',
        name: 'Pacte de Non-Agression',
        description: 'Zones neutres, commerce autorisé, cessez-le-feu',
        cost: 10,
        icon: '🕊️'
      },
      {
        type: 'acces_militaire',
        name: 'Accès Militaire',
        description: 'Passage d\'unités militaires, accès aux territoires',
        cost: 8,
        icon: '🚶'
      },
      {
        type: 'echange_ressources',
        name: 'Échange de Ressources',
        description: 'Échange direct de ressources et objets uniques en temps réel',
        cost: 12,
        icon: '🔄'
      },
      {
        type: 'defense_mutuelle',
        name: 'Défense Mutuelle',
        description: 'Soutien défensif, territoires partagés, contact d\'urgence',
        cost: 20,
        icon: '🛡️'
      }
    ];
  }

  async getStats(playerId: string): Promise<{
    totalTreaties: number;
    activeTreaties: number;
    proposedTreaties: number;
    createdTreaties: number;
    signedTreaties: number;
  }> {
    const playerTreaties = await this.getTreatiesForPlayer(playerId);
    
    return {
      totalTreaties: playerTreaties.length,
      activeTreaties: playerTreaties.filter(t => t.status === 'active').length,
      proposedTreaties: playerTreaties.filter(t => t.status === 'proposed').length,
      createdTreaties: playerTreaties.filter(t => t.createdBy === playerId).length,
      signedTreaties: playerTreaties.filter(t => {
        const sigs = t.signatures as { playerId: string; signedAt: number }[];
        return sigs.some(sig => sig.playerId === playerId);
      }).length
    };
  }

  async getTreatiesByType(type: TreatyType): Promise<Treaty[]> {
    return await db.select().from(treaties)
      .where(eq(treaties.type, type));
  }

  async hasActiveTreaty(playerId1: string, playerId2: string, type?: TreatyType): Promise<boolean> {
    const conditions = [
      eq(treaties.status, 'active'),
      sql`${treaties.parties}::jsonb @> ${JSON.stringify([playerId1])}::jsonb`,
      sql`${treaties.parties}::jsonb @> ${JSON.stringify([playerId2])}::jsonb`
    ];
    
    if (type) {
      conditions.push(eq(treaties.type, type));
    }
    
    const [result] = await db.select().from(treaties)
      .where(and(...conditions))
      .limit(1);
    
    return !!result;
  }

  async cleanExpiredTreaties(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    const cutoffDate = new Date(Date.now() - maxAge);
    
    await db.delete(treaties)
      .where(and(
        eq(treaties.status, 'expired'),
        lt(treaties.createdAt, cutoffDate)
      ));
  }

  async getAllTreaties(): Promise<Treaty[]> {
    return await db.select().from(treaties);
  }
}

export const treatyService = new TreatyService();
export type { Treaty };
