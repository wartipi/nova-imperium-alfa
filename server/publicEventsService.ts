import { PublicEvent, PublicEventType, EventPriority, EventFilter, createPublicEvent } from '../shared/publicEventsSchema';

/**
 * Service pour gérer les événements publics du jeu
 * Ces événements sont visibles par tous les joueurs et constituent le "journal" du monde
 */
export class PublicEventsService {
  private events: Map<string, PublicEvent> = new Map();
  private eventIdCounter = 1;

  /**
   * Ajoute un nouvel événement public
   */
  addEvent(
    type: PublicEventType,
    title: string,
    description: string,
    participants: string[],
    currentTurn: number,
    priority: EventPriority = 'medium',
    location?: { x: number; y: number; regionName?: string },
    metadata?: Record<string, any>
  ): PublicEvent {
    const eventBase = createPublicEvent(
      type,
      title,
      description,
      participants,
      currentTurn,
      priority,
      location,
      metadata
    );

    const event: PublicEvent = {
      ...eventBase,
      id: `event_${this.eventIdCounter++}`,
      timestamp: new Date()
    };

    this.events.set(event.id, event);
    console.log(`📰 Nouvel événement public: ${event.title}`);

    return event;
  }

  /**
   * Récupère tous les événements avec filtres optionnels
   */
  getEvents(filter?: EventFilter, limit?: number): PublicEvent[] {
    let filteredEvents = Array.from(this.events.values())
      .filter(event => event.isVisible)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filter) {
      if (filter.types) {
        filteredEvents = filteredEvents.filter(event => filter.types!.includes(event.type));
      }
      if (filter.priorities) {
        filteredEvents = filteredEvents.filter(event => filter.priorities!.includes(event.priority));
      }
      if (filter.participants) {
        filteredEvents = filteredEvents.filter(event => 
          event.participants.some(p => filter.participants!.includes(p))
        );
      }
      if (filter.turnRange) {
        filteredEvents = filteredEvents.filter(event => 
          event.turn >= filter.turnRange!.from && event.turn <= filter.turnRange!.to
        );
      }
      if (filter.location) {
        filteredEvents = filteredEvents.filter(event => {
          if (!event.location) return false;
          const distance = Math.sqrt(
            Math.pow(event.location.x - filter.location!.x, 2) +
            Math.pow(event.location.y - filter.location!.y, 2)
          );
          return distance <= filter.location!.radius;
        });
      }
    }

    return limit ? filteredEvents.slice(0, limit) : filteredEvents;
  }

  /**
   * Récupère les événements récents (derniers X tours)
   */
  getRecentEvents(currentTurn: number, turnsBack: number = 5, limit: number = 20): PublicEvent[] {
    const filter: EventFilter = {
      turnRange: {
        from: Math.max(1, currentTurn - turnsBack),
        to: currentTurn
      }
    };
    return this.getEvents(filter, limit);
  }

  /**
   * Récupère les événements par priorité
   */
  getEventsByPriority(priority: EventPriority, limit?: number): PublicEvent[] {
    const filter: EventFilter = { priorities: [priority] };
    return this.getEvents(filter, limit);
  }

  /**
   * Récupère les événements impliquant un joueur/faction spécifique
   */
  getEventsForParticipant(participantId: string, limit?: number): PublicEvent[] {
    const filter: EventFilter = { participants: [participantId] };
    return this.getEvents(filter, limit);
  }

  /**
   * Met à jour la visibilité d'un événement
   */
  setEventVisibility(eventId: string, isVisible: boolean): boolean {
    const event = this.events.get(eventId);
    if (event) {
      event.isVisible = isVisible;
      return true;
    }
    return false;
  }

  /**
   * Supprime un événement
   */
  deleteEvent(eventId: string): boolean {
    return this.events.delete(eventId);
  }

  // === MÉTHODES UTILITAIRES POUR CRÉER DES ÉVÉNEMENTS SPÉCIFIQUES ===

  /**
   * Crée un événement d'alliance signée
   */
  createAllianceEvent(
    faction1: string,
    faction2: string,
    allianceType: string,
    currentTurn: number,
    terms?: string[]
  ): PublicEvent {
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

  /**
   * Crée un événement de campagne militaire
   */
  createCampaignEvent(
    isVictory: boolean,
    campaignName: string,
    attacker: string,
    defender: string,
    currentTurn: number,
    location?: { x: number; y: number; regionName?: string },
    casualties?: { attacker: number; defender: number }
  ): PublicEvent {
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

  /**
   * Crée un événement de conquête territoriale
   */
  createTerritoryConquestEvent(
    territoryName: string,
    previousOwner: string,
    newOwner: string,
    currentTurn: number,
    location: { x: number; y: number; regionName?: string },
    method: 'military' | 'diplomatic' | 'economic' = 'military'
  ): PublicEvent {
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
        resistance: 'moderate' // Par défaut
      }
    );
  }

  /**
   * Crée un événement de déclaration de guerre
   */
  createWarDeclarationEvent(
    aggressor: string,
    target: string,
    currentTurn: number,
    reason?: string
  ): PublicEvent {
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

  /**
   * Crée un événement de traité de paix
   */
  createPeaceTreatyEvent(
    faction1: string,
    faction2: string,
    currentTurn: number,
    terms?: string[]
  ): PublicEvent {
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

  /**
   * Crée un événement de fondation de ville
   */
  createCityFoundationEvent(
    cityName: string,
    founder: string,
    currentTurn: number,
    location: { x: number; y: number; regionName?: string }
  ): PublicEvent {
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

  /**
   * Crée un événement de création de faction
   */
  createFactionCreationEvent(
    factionName: string,
    founder: string,
    currentTurn: number,
    memberCount?: number
  ): PublicEvent {
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

  /**
   * Crée un événement de découverte de ressource majeure
   */
  createResourceDiscoveryEvent(
    resourceType: string,
    discoverer: string,
    currentTurn: number,
    location: { x: number; y: number; regionName?: string },
    quantity?: number
  ): PublicEvent {
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

  /**
   * Initialise le service avec quelques événements d'exemple
   */
  initializeDemoEvents(currentTurn: number = 1): void {
    // Alliance entre deux factions
    this.createAllianceEvent(
      'Royaume de Vaeloria',
      'République de Theros',
      'Alliance Commerciale',
      currentTurn - 2,
      ['Libre échange de ressources', 'Protection mutuelle des routes commerciales']
    );

    // Victoire militaire
    this.createCampaignEvent(
      true,
      'Siège de Drakmoor',
      'Ordre des Paladins',
      'Clans Barbares',
      currentTurn - 1,
      { x: 25, y: 15, regionName: 'Montagnes de Drakmoor' },
      { attacker: 45, defender: 120 }
    );

    // Fondation de ville
    this.createCityFoundationEvent(
      'Nova Petra',
      'Guilde des Marchands',
      currentTurn,
      { x: 30, y: 20, regionName: 'Plaines Fertiles' }
    );

    // Découverte de ressource
    this.createResourceDiscoveryEvent(
      'Mithril',
      'Compagnie Minière du Nord',
      currentTurn - 3,
      { x: 10, y: 5, regionName: 'Pics Gelés' },
      500
    );

    // Création de faction
    this.createFactionCreationEvent(
      'Confrérie des Artisans',
      'Maître Forgeron Aldric',
      currentTurn - 4,
      12
    );
  }

  /**
   * Obtient les statistiques des événements
   */
  getEventStatistics(): {
    total: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    recentActivity: number;
  } {
    const events = Array.from(this.events.values()).filter(e => e.isVisible);
    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    events.forEach(event => {
      byType[event.type] = (byType[event.type] || 0) + 1;
      byPriority[event.priority] = (byPriority[event.priority] || 0) + 1;
    });

    const recentActivity = events.filter(e => {
      const daysSinceEvent = (Date.now() - e.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceEvent <= 7; // Derniers 7 jours
    }).length;

    return {
      total: events.length,
      byType,
      byPriority,
      recentActivity
    };
  }
}

// Instance singleton du service
export const publicEventsService = new PublicEventsService();