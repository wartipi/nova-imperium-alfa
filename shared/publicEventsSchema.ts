import { z } from 'zod';

// Types d'événements publics possibles
export const PublicEventType = z.enum([
  'alliance_signed',          // Alliance signée publiquement
  'alliance_broken',          // Alliance rompue
  'war_declared',            // Déclaration de guerre
  'peace_treaty_signed',     // Traité de paix signé
  'campaign_victory',        // Victoire de campagne militaire
  'campaign_defeat',         // Défaite de campagne militaire
  'territory_conquered',     // Territoire conquis
  'city_founded',           // Nouvelle ville fondée
  'trade_agreement',        // Accord commercial majeur
  'diplomatic_mission',     // Mission diplomatique
  'faction_created',        // Nouvelle faction créée
  'faction_disbanded',      // Faction dissoute
  'leader_change',          // Changement de dirigeant
  'resource_discovery',     // Découverte de ressource majeure
  'natural_disaster',       // Catastrophe naturelle
  'festival_event',         // Événement festif du royaume
  'economic_crisis',        // Crise économique
  'plague_outbreak',        // Épidémie
  'technological_advance',  // Avancée technologique
  'religious_event'         // Événement religieux
]);

export type PublicEventType = z.infer<typeof PublicEventType>;

// Priorité d'affichage des événements
export const EventPriority = z.enum(['low', 'medium', 'high', 'critical']);
export type EventPriority = z.infer<typeof EventPriority>;

// Schéma principal pour un événement public
export const PublicEventSchema = z.object({
  id: z.string(),
  type: PublicEventType,
  title: z.string(),
  description: z.string(),
  participants: z.array(z.string()), // IDs des joueurs/factions impliqués
  location: z.object({
    x: z.number(),
    y: z.number(),
    regionName: z.string().optional()
  }).optional(),
  priority: EventPriority,
  turn: z.number(),
  timestamp: z.date(),
  isVisible: z.boolean().default(true),
  icon: z.string(), // Emoji ou icône représentant l'événement
  consequences: z.array(z.string()).optional(), // Conséquences de l'événement
  relatedEvents: z.array(z.string()).optional(), // IDs d'autres événements liés
  metadata: z.record(z.any()).optional() // Données spécifiques à chaque type d'événement
});

export type PublicEvent = z.infer<typeof PublicEventSchema>;

// Schémas spécialisés pour différents types d'événements
export const AllianceEventSchema = PublicEventSchema.extend({
  type: z.literal('alliance_signed'),
  metadata: z.object({
    allianceType: z.string(),
    factionNames: z.array(z.string()),
    duration: z.number().optional(),
    terms: z.array(z.string()).optional()
  }).optional()
});

export const CampaignEventSchema = PublicEventSchema.extend({
  type: z.enum(['campaign_victory', 'campaign_defeat']),
  metadata: z.object({
    campaignName: z.string(),
    attackerFaction: z.string(),
    defenderFaction: z.string(),
    casualties: z.object({
      attacker: z.number(),
      defender: z.number()
    }).optional(),
    territoriesChanged: z.array(z.string()).optional(),
    spoils: z.record(z.number()).optional()
  }).optional()
});

export const TerritoryEventSchema = PublicEventSchema.extend({
  type: z.literal('territory_conquered'),
  metadata: z.object({
    territoryName: z.string(),
    previousOwner: z.string(),
    newOwner: z.string(),
    method: z.enum(['military', 'diplomatic', 'economic']),
    resistance: z.enum(['none', 'light', 'moderate', 'heavy'])
  }).optional()
});

// Structure pour les filtres d'événements
export const EventFilterSchema = z.object({
  types: z.array(PublicEventType).optional(),
  priorities: z.array(EventPriority).optional(),
  participants: z.array(z.string()).optional(),
  turnRange: z.object({
    from: z.number(),
    to: z.number()
  }).optional(),
  location: z.object({
    x: z.number(),
    y: z.number(),
    radius: z.number()
  }).optional()
});

export type EventFilter = z.infer<typeof EventFilterSchema>;

// Configuration pour l'affichage des événements
export const EventDisplayConfig = {
  alliance_signed: {
    icon: '🤝',
    color: 'text-green-600',
    priority: 'high' as EventPriority,
    template: '{participants} ont signé une alliance {allianceType}'
  },
  alliance_broken: {
    icon: '💔',
    color: 'text-red-600',
    priority: 'high' as EventPriority,
    template: 'L\'alliance entre {participants} a été rompue'
  },
  war_declared: {
    icon: '⚔️',
    color: 'text-red-700',
    priority: 'critical' as EventPriority,
    template: '{attacker} a déclaré la guerre à {defender}'
  },
  peace_treaty_signed: {
    icon: '🕊️',
    color: 'text-blue-600',
    priority: 'high' as EventPriority,
    template: 'Traité de paix signé entre {participants}'
  },
  campaign_victory: {
    icon: '🏆',
    color: 'text-yellow-600',
    priority: 'high' as EventPriority,
    template: '{winner} remporte la campagne {campaignName}'
  },
  campaign_defeat: {
    icon: '💀',
    color: 'text-gray-600',
    priority: 'medium' as EventPriority,
    template: '{loser} subit une défaite dans la campagne {campaignName}'
  },
  territory_conquered: {
    icon: '🏴',
    color: 'text-purple-600',
    priority: 'high' as EventPriority,
    template: '{newOwner} a conquis {territoryName} de {previousOwner}'
  },
  city_founded: {
    icon: '🏘️',
    color: 'text-green-500',
    priority: 'medium' as EventPriority,
    template: 'Nouvelle ville {cityName} fondée par {founder}'
  },
  trade_agreement: {
    icon: '📦',
    color: 'text-blue-500',
    priority: 'medium' as EventPriority,
    template: 'Accord commercial signé entre {participants}'
  },
  faction_created: {
    icon: '🏛️',
    color: 'text-indigo-600',
    priority: 'medium' as EventPriority,
    template: 'Nouvelle faction {factionName} créée par {founder}'
  },
  faction_disbanded: {
    icon: '🏚️',
    color: 'text-gray-500',
    priority: 'medium' as EventPriority,
    template: 'La faction {factionName} a été dissoute'
  },
  resource_discovery: {
    icon: '💎',
    color: 'text-cyan-600',
    priority: 'medium' as EventPriority,
    template: 'Découverte de {resourceType} en {location}'
  },
  natural_disaster: {
    icon: '🌪️',
    color: 'text-red-500',
    priority: 'high' as EventPriority,
    template: '{disasterType} frappe la région de {location}'
  },
  festival_event: {
    icon: '🎉',
    color: 'text-pink-500',
    priority: 'low' as EventPriority,
    template: 'Festival {festivalName} organisé à {location}'
  },
  economic_crisis: {
    icon: '📉',
    color: 'text-red-400',
    priority: 'high' as EventPriority,
    template: 'Crise économique dans la région de {location}'
  },
  technological_advance: {
    icon: '⚙️',
    color: 'text-amber-600',
    priority: 'medium' as EventPriority,
    template: '{faction} développe la technologie {technology}'
  },
  religious_event: {
    icon: '⛪',
    color: 'text-purple-500',
    priority: 'medium' as EventPriority,
    template: 'Événement religieux: {eventName} à {location}'
  },
  diplomatic_mission: {
    icon: '📋',
    color: 'text-blue-500',
    priority: 'medium' as EventPriority,
    template: 'Mission diplomatique: {mission} entre {participants}'
  },
  leader_change: {
    icon: '👑',
    color: 'text-yellow-600',
    priority: 'high' as EventPriority,
    template: 'Changement de dirigeant: {newLeader} remplace {oldLeader}'
  },
  plague_outbreak: {
    icon: '🦠',
    color: 'text-green-700',
    priority: 'critical' as EventPriority,
    template: 'Épidémie de {plagueType} à {location}'
  }
} as const;

// Utilitaires pour créer des événements
export const createPublicEvent = (
  type: PublicEventType,
  title: string,
  description: string,
  participants: string[],
  turn: number,
  priority: EventPriority = 'medium',
  location?: { x: number; y: number; regionName?: string },
  metadata?: Record<string, any>
): Omit<PublicEvent, 'id' | 'timestamp'> => {
  const config = EventDisplayConfig[type];
  
  return {
    type,
    title,
    description,
    participants,
    location,
    priority,
    turn,
    isVisible: true,
    icon: config.icon,
    metadata
  };
};

export default {
  PublicEventSchema,
  AllianceEventSchema,
  CampaignEventSchema,
  TerritoryEventSchema,
  EventFilterSchema,
  EventDisplayConfig,
  createPublicEvent
};