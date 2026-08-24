import { eq, and, gte, lte, inArray, desc } from "drizzle-orm";
import { db } from "./db";
import { publicEvents } from "../shared/schema";
import type { PublicEvent, InsertPublicEvent } from "../shared/schema";
import { EventDisplayConfig, type PublicEventType, type EventPriority } from '../shared/publicEventsSchema';

// Le serveur n'a aucune notion fiable du tour courant : le numéro vient du navigateur (voir ÉCONOMIE-1).
// Les événements sont donc datés « tour inconnu » jusqu'à ce qu'un vrai compteur existe côté serveur.
// Une seule constante sera à changer le jour venu.
export const UNKNOWN_TURN = 0;

// Fenêtre de l'onglet « Récents », exprimée en heures.
// Le serveur n'ayant aucune notion fiable du tour courant (voir ÉCONOMIE-1), « récent »
// se mesure en temps réel à partir de l'horodatage de chaque événement.
export const RECENT_WINDOW_HOURS = 48;

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
    let query = db.select().from(publicEvents)
      .where(eq(publicEvents.isVisible, true))
      .orderBy(desc(publicEvents.timestamp));

    let events = await query;

    if (filter) {
      if (filter.types && filter.types.length > 0) {
        events = events.filter(event => filter.types!.includes(event.type));
      }
      if (filter.priorities && filter.priorities.length > 0) {
        events = events.filter(event => filter.priorities!.includes(event.priority));
      }
      if (filter.participants && filter.participants.length > 0) {
        events = events.filter(event => {
          const eventParticipants = event.participants as string[];
          return eventParticipants.some(p => filter.participants!.includes(p));
        });
      }
      if (filter.turnRange) {
        events = events.filter(event => 
          event.turn >= filter.turnRange!.from && event.turn <= filter.turnRange!.to
        );
      }
      if (filter.location) {
        events = events.filter(event => {
          if (!event.location) return false;
          const loc = event.location as { x: number; y: number };
          const distance = Math.sqrt(
            Math.pow(loc.x - filter.location!.x, 2) +
            Math.pow(loc.y - filter.location!.y, 2)
          );
          return distance <= filter.location!.radius;
        });
      }
    }

    return limit ? events.slice(0, limit) : events;
  }

  async getRecentEvents(limit: number = 20): Promise<PublicEvent[]> {
    const events = await this.getEvents();
    const cutoff = Date.now() - RECENT_WINDOW_HOURS * 60 * 60 * 1000;
    return events
      .filter(event => new Date(event.timestamp).getTime() >= cutoff)
      .slice(0, limit);
  }

  async getEventsByPriority(priority: EventPriority, limit?: number): Promise<PublicEvent[]> {
    const filter: EventFilter = { priorities: [priority] };
    return this.getEvents(filter, limit);
  }

  async getEventsForParticipant(participantId: string, limit?: number): Promise<PublicEvent[]> {
    const filter: EventFilter = { participants: [participantId] };
    return this.getEvents(filter, limit);
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

  async getEventStatistics(): Promise<{
    total: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    recentActivity: number;
  }> {
    const events = await this.getEvents();
    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    events.forEach(event => {
      byType[event.type] = (byType[event.type] || 0) + 1;
      byPriority[event.priority] = (byPriority[event.priority] || 0) + 1;
    });

    const recentActivity = events.filter(e => {
      const daysSinceEvent = (Date.now() - new Date(e.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceEvent <= 7;
    }).length;

    return {
      total: events.length,
      byType,
      byPriority,
      recentActivity
    };
  }
}

export const publicEventsService = new PublicEventsService();
