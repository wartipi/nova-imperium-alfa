import { eq, and, gte, lte, inArray, desc, asc, sql, count, or } from "drizzle-orm";
import { db } from "./db";
import { publicEvents } from "../shared/schema";
import type { PublicEvent, InsertPublicEvent } from "../shared/schema";
import { EventDisplayConfig, type PublicEventType, type EventPriority } from '../shared/publicEventsSchema';
import { createJsonbLocationDistanceCondition } from "./utils/geospatial";

interface EventFilter {
  types?: string[];
  priorities?: string[];
  participants?: string[];
  turnRange?: { from: number; to: number };
  location?: { x: number; y: number; radius: number };
}

export class PublicEventsService {
  
  async addEvent(
    type: PublicEventType,
    title: string,
    description: string,
    participants: string[],
    currentTurn: number,
    priority: EventPriority = 'medium',
    location?: { x: number; y: number; regionName?: string },
    metadata?: Record<string, any>
  ): Promise<PublicEvent> {
    const config = EventDisplayConfig[type];
    const id = `event_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    const [event] = await db.insert(publicEvents).values({
      id,
      type,
      title,
      description,
      participants,
      location: location || null,
      priority,
      turn: currentTurn,
      timestamp: new Date(),
      isVisible: true,
      icon: config.icon,
      consequences: null,
      relatedEvents: null,
      metadata: metadata || null
    }).returning();

    console.log(`📰 Nouvel événement public: ${event.title}`);
    return event;
  }

  async getEvents(filter?: EventFilter, limit?: number): Promise<PublicEvent[]> {
    const conditions = [eq(publicEvents.isVisible, true)];

    if (filter) {
      if (filter.types && filter.types.length > 0) {
        conditions.push(inArray(publicEvents.type, filter.types));
      }
      if (filter.priorities && filter.priorities.length > 0) {
        conditions.push(inArray(publicEvents.priority, filter.priorities));
      }
      if (filter.turnRange) {
        conditions.push(gte(publicEvents.turn, filter.turnRange.from));
        conditions.push(lte(publicEvents.turn, filter.turnRange.to));
      }
      
      if (filter.participants && filter.participants.length > 0) {
        const participantConditions = filter.participants.map(p => 
          sql`${publicEvents.participants}::jsonb @> ${JSON.stringify([p])}::jsonb`
        );
        conditions.push(or(...participantConditions)!);
      }
      
      if (filter.location) {
        const { x, y, radius } = filter.location;
        conditions.push(sql`${publicEvents.location} IS NOT NULL`);
        
        const locationConditions = createJsonbLocationDistanceCondition(
          publicEvents.location,
          x,
          y,
          radius
        );
        conditions.push(...locationConditions);
      }
    }

    const events = await db.select().from(publicEvents)
      .where(and(...conditions))
      .orderBy(desc(publicEvents.timestamp))
      .limit(limit ?? 100);

    return events;
  }

  async getRecentEvents(currentTurn: number, turnsBack: number = 5, limit: number = 20): Promise<PublicEvent[]> {
    const filter: EventFilter = {
      turnRange: {
        from: Math.max(1, currentTurn - turnsBack),
        to: currentTurn
      }
    };
    return this.getEvents(filter, limit);
  }

  async getEventsByPriority(priority: EventPriority, limit?: number): Promise<PublicEvent[]> {
    const filter: EventFilter = { priorities: [priority] };
    return this.getEvents(filter, limit);
  }

  async getEventsForParticipant(participantId: string, limit?: number): Promise<PublicEvent[]> {
    const filter: EventFilter = { participants: [participantId] };
    return this.getEvents(filter, limit);
  }

  async findNearbyEvents(x: number, y: number, radius: number, limit: number = 20): Promise<PublicEvent[]> {
    const locationConditions = createJsonbLocationDistanceCondition(
      publicEvents.location,
      x,
      y,
      radius
    );

    const events = await db.select().from(publicEvents)
      .where(and(
        eq(publicEvents.isVisible, true),
        sql`${publicEvents.location} IS NOT NULL`,
        ...locationConditions
      ))
      .orderBy(
        asc(sql`SQRT(POWER((${publicEvents.location}->>'x')::float - ${x}, 2) + POWER((${publicEvents.location}->>'y')::float - ${y}, 2))`),
        desc(publicEvents.timestamp)
      )
      .limit(limit);

    return events;
  }

  async setEventVisibility(eventId: string, isVisible: boolean): Promise<boolean> {
    const result = await db.update(publicEvents)
      .set({ isVisible })
      .where(eq(publicEvents.id, eventId));
    return true;
  }

  async deleteEvent(eventId: string): Promise<boolean> {
    await db.delete(publicEvents).where(eq(publicEvents.id, eventId));
    return true;
  }

  async createAllianceEvent(
    faction1: string,
    faction2: string,
    allianceType: string,
    currentTurn: number,
    terms?: string[]
  ): Promise<PublicEvent> {
    return this.addEvent(
      'alliance_signed',
      `Alliance ${allianceType} signée`,
      `Une nouvelle alliance "${allianceType}" a été formée entre ${faction1} et ${faction2}.`,
      [faction1, faction2],
      currentTurn,
      'high',
      undefined,
      {
        allianceType,
        factionNames: [faction1, faction2],
        terms: terms || []
      }
    );
  }

  async createCampaignEvent(
    isVictory: boolean,
    campaignName: string,
    attacker: string,
    defender: string,
    currentTurn: number,
    location?: { x: number; y: number; regionName?: string },
    casualties?: { attacker: number; defender: number }
  ): Promise<PublicEvent> {
    const winner = isVictory ? attacker : defender;
    const loser = isVictory ? defender : attacker;
    
    return this.addEvent(
      isVictory ? 'campaign_victory' : 'campaign_defeat',
      `Campagne ${campaignName}: ${isVictory ? 'Victoire' : 'Défaite'}`,
      `La campagne "${campaignName}" s'achève par une ${isVictory ? 'victoire' : 'défaite'} de ${winner} contre ${loser}.`,
      [attacker, defender],
      currentTurn,
      'high',
      location,
      {
        campaignName,
        attackerFaction: attacker,
        defenderFaction: defender,
        casualties: casualties || { attacker: 0, defender: 0 }
      }
    );
  }

  async createTerritoryConquestEvent(
    territoryName: string,
    previousOwner: string,
    newOwner: string,
    currentTurn: number,
    location: { x: number; y: number; regionName?: string },
    method: 'military' | 'diplomatic' | 'economic' = 'military'
  ): Promise<PublicEvent> {
    return this.addEvent(
      'territory_conquered',
      `${territoryName} conquis`,
      `Le territoire de ${territoryName} passe sous le contrôle de ${newOwner}, anciennement détenu par ${previousOwner}.`,
      [previousOwner, newOwner],
      currentTurn,
      'high',
      location,
      {
        territoryName,
        previousOwner,
        newOwner,
        method,
        resistance: 'moderate'
      }
    );
  }

  async createWarDeclarationEvent(
    aggressor: string,
    target: string,
    currentTurn: number,
    reason?: string
  ): Promise<PublicEvent> {
    return this.addEvent(
      'war_declared',
      `Déclaration de guerre`,
      `${aggressor} déclare officiellement la guerre à ${target}${reason ? ` pour ${reason}` : ''}.`,
      [aggressor, target],
      currentTurn,
      'critical',
      undefined,
      {
        aggressor,
        target,
        reason: reason || 'Non spécifiée'
      }
    );
  }

  async createPeaceTreatyEvent(
    faction1: string,
    faction2: string,
    currentTurn: number,
    terms?: string[]
  ): Promise<PublicEvent> {
    return this.addEvent(
      'peace_treaty_signed',
      `Traité de paix signé`,
      `Un traité de paix officiel a été signé entre ${faction1} et ${faction2}, mettant fin aux hostilités.`,
      [faction1, faction2],
      currentTurn,
      'high',
      undefined,
      {
        participants: [faction1, faction2],
        terms: terms || []
      }
    );
  }

  async createCityFoundationEvent(
    cityName: string,
    founder: string,
    currentTurn: number,
    location: { x: number; y: number; regionName?: string }
  ): Promise<PublicEvent> {
    return this.addEvent(
      'city_founded',
      `Nouvelle ville fondée`,
      `La ville de ${cityName} a été fondée par ${founder} et accueille désormais ses premiers habitants.`,
      [founder],
      currentTurn,
      'medium',
      location,
      {
        cityName,
        founder,
        foundationDate: currentTurn
      }
    );
  }

  async createFactionCreationEvent(
    factionName: string,
    founder: string,
    currentTurn: number,
    memberCount?: number
  ): Promise<PublicEvent> {
    return this.addEvent(
      'faction_created',
      `Nouvelle faction créée`,
      `La faction "${factionName}" a été officiellement créée par ${founder}.`,
      [founder],
      currentTurn,
      'medium',
      undefined,
      {
        factionName,
        founder,
        memberCount: memberCount || 1
      }
    );
  }

  async createResourceDiscoveryEvent(
    resourceType: string,
    discoverer: string,
    currentTurn: number,
    location: { x: number; y: number; regionName?: string },
    quantity?: number
  ): Promise<PublicEvent> {
    return this.addEvent(
      'resource_discovery',
      `Découverte de ${resourceType}`,
      `D'importants gisements de ${resourceType} ont été découverts par ${discoverer}.`,
      [discoverer],
      currentTurn,
      'medium',
      location,
      {
        resourceType,
        discoverer,
        quantity: quantity || 'importante'
      }
    );
  }

  async createNaturalDisasterEvent(
    disasterType: string,
    currentTurn: number,
    location: { x: number; y: number; regionName?: string },
    affectedFactions: string[]
  ): Promise<PublicEvent> {
    return this.addEvent(
      'natural_disaster',
      `${disasterType}`,
      `Une ${disasterType.toLowerCase()} dévaste la région de ${location.regionName || 'inconnue'}.`,
      affectedFactions,
      currentTurn,
      'high',
      location,
      {
        disasterType,
        affectedFactions
      }
    );
  }

  async initializeDemoEvents(currentTurn: number = 1): Promise<void> {
    await this.createAllianceEvent(
      'Royaume de Vaeloria',
      'République de Theros',
      'Alliance Commerciale',
      currentTurn - 2,
      ['Libre échange de ressources', 'Protection mutuelle des routes commerciales']
    );

    await this.createCampaignEvent(
      true,
      'Siège de Drakmoor',
      'Ordre des Paladins',
      'Clans Barbares',
      currentTurn - 1,
      { x: 25, y: 15, regionName: 'Montagnes de Drakmoor' },
      { attacker: 45, defender: 120 }
    );

    await this.createCityFoundationEvent(
      'Nova Petra',
      'Guilde des Marchands',
      currentTurn,
      { x: 30, y: 20, regionName: 'Plaines Fertiles' }
    );

    await this.createResourceDiscoveryEvent(
      'Mithril',
      'Compagnie Minière du Nord',
      currentTurn - 3,
      { x: 10, y: 5, regionName: 'Pics Gelés' },
      500
    );

    await this.createFactionCreationEvent(
      'Confrérie des Artisans',
      'Maître Forgeron Aldric',
      currentTurn - 4,
      12
    );
  }

  async getEventStatistics(): Promise<{
    total: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    recentActivity: number;
  }> {
    const [totalResult] = await db.select({ count: count() })
      .from(publicEvents)
      .where(eq(publicEvents.isVisible, true));

    const typeStats = await db.select({
      type: publicEvents.type,
      count: count()
    })
      .from(publicEvents)
      .where(eq(publicEvents.isVisible, true))
      .groupBy(publicEvents.type);

    const priorityStats = await db.select({
      priority: publicEvents.priority,
      count: count()
    })
      .from(publicEvents)
      .where(eq(publicEvents.isVisible, true))
      .groupBy(publicEvents.priority);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [recentResult] = await db.select({ count: count() })
      .from(publicEvents)
      .where(and(
        eq(publicEvents.isVisible, true),
        gte(publicEvents.timestamp, sevenDaysAgo)
      ));

    const byType: Record<string, number> = {};
    typeStats.forEach(stat => {
      byType[stat.type] = stat.count;
    });

    const byPriority: Record<string, number> = {};
    priorityStats.forEach(stat => {
      byPriority[stat.priority] = stat.count;
    });

    return {
      total: totalResult?.count ?? 0,
      byType,
      byPriority,
      recentActivity: recentResult?.count ?? 0
    };
  }
}

export const publicEventsService = new PublicEventsService();
