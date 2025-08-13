import { Router } from 'express';
import { publicEventsService } from '../publicEventsService';
import { EventFilter } from '../../shared/publicEventsSchema';

const router = Router();

/**
 * GET /api/public-events
 * Récupère tous les événements publics avec filtres optionnels
 */
router.get('/', (req, res) => {
  try {
    const { 
      types, 
      priorities, 
      participants, 
      turnFrom, 
      turnTo, 
      locationX, 
      locationY, 
      locationRadius,
      limit 
    } = req.query;

    const filter: EventFilter = {};

    if (types) {
      const typeArray = Array.isArray(types) ? types : [types];
      filter.types = typeArray as ('alliance_signed' | 'alliance_broken' | 'war_declared' | 'peace_treaty_signed' | 'campaign_victory' | 'campaign_defeat' | 'territory_conquered' | 'city_founded' | 'trade_agreement' | 'diplomatic_mission' | 'faction_created' | 'faction_disbanded' | 'leader_change' | 'resource_discovery' | 'natural_disaster' | 'festival_event' | 'economic_crisis' | 'plague_outbreak' | 'technological_advance' | 'religious_event')[];
    }
    if (priorities) {
      const priorityArray = Array.isArray(priorities) ? priorities : [priorities];
      filter.priorities = priorityArray as ('critical' | 'high' | 'medium' | 'low')[];
    }
    if (participants) {
      filter.participants = Array.isArray(participants) ? participants as string[] : [participants as string];
    }
    if (turnFrom && turnTo) {
      filter.turnRange = {
        from: parseInt(turnFrom as string),
        to: parseInt(turnTo as string)
      };
    }
    if (locationX && locationY && locationRadius) {
      filter.location = {
        x: parseInt(locationX as string),
        y: parseInt(locationY as string),
        radius: parseInt(locationRadius as string)
      };
    }

    const events = publicEventsService.getEvents(
      filter, 
      limit ? parseInt(limit as string) : undefined
    );

    res.json(events);
  } catch (error) {
    console.error('Erreur lors de la récupération des événements:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/public-events/recent/:turn
 * Récupère les événements récents basés sur le tour actuel
 */
router.get('/recent/:turn', (req, res) => {
  try {
    const currentTurn = parseInt(req.params.turn);
    const { turnsBack = '5', limit = '20' } = req.query;
    
    const events = publicEventsService.getRecentEvents(
      currentTurn, 
      parseInt(turnsBack as string),
      parseInt(limit as string)
    );
    
    res.json(events);
  } catch (error) {
    console.error('Erreur lors de la récupération des événements récents:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/public-events/priority/:priority
 * Récupère les événements par priorité
 */
router.get('/priority/:priority', (req, res) => {
  try {
    const { priority } = req.params;
    const { limit } = req.query;
    
    const events = publicEventsService.getEventsByPriority(
      priority as any,
      limit ? parseInt(limit as string) : undefined
    );
    
    res.json(events);
  } catch (error) {
    console.error('Erreur lors de la récupération par priorité:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/public-events/participant/:participantId
 * Récupère les événements impliquant un participant spécifique
 */
router.get('/participant/:participantId', (req, res) => {
  try {
    const { participantId } = req.params;
    const { limit } = req.query;
    
    const events = publicEventsService.getEventsForParticipant(
      participantId,
      limit ? parseInt(limit as string) : undefined
    );
    
    res.json(events);
  } catch (error) {
    console.error('Erreur lors de la récupération par participant:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/public-events/statistics
 * Récupère les statistiques des événements
 */
router.get('/statistics', (req, res) => {
  try {
    const stats = publicEventsService.getEventStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/public-events/alliance
 * Crée un événement d'alliance
 */
router.post('/alliance', (req, res) => {
  try {
    const { faction1, faction2, allianceType, currentTurn, terms } = req.body;
    
    const event = publicEventsService.createAllianceEvent(
      faction1,
      faction2,
      allianceType,
      currentTurn,
      terms
    );
    
    res.json(event);
  } catch (error) {
    console.error('Erreur lors de la création d\'événement d\'alliance:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/public-events/campaign
 * Crée un événement de campagne militaire
 */
router.post('/campaign', (req, res) => {
  try {
    const { 
      isVictory, 
      campaignName, 
      attacker, 
      defender, 
      currentTurn, 
      location, 
      casualties 
    } = req.body;
    
    const event = publicEventsService.createCampaignEvent(
      isVictory,
      campaignName,
      attacker,
      defender,
      currentTurn,
      location,
      casualties
    );
    
    res.json(event);
  } catch (error) {
    console.error('Erreur lors de la création d\'événement de campagne:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/public-events/war-declaration
 * Crée un événement de déclaration de guerre
 */
router.post('/war-declaration', (req, res) => {
  try {
    const { aggressor, target, currentTurn, reason } = req.body;
    
    const event = publicEventsService.createWarDeclarationEvent(
      aggressor,
      target,
      currentTurn,
      reason
    );
    
    res.json(event);
  } catch (error) {
    console.error('Erreur lors de la création d\'événement de guerre:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/public-events/peace-treaty
 * Crée un événement de traité de paix
 */
router.post('/peace-treaty', (req, res) => {
  try {
    const { faction1, faction2, currentTurn, terms } = req.body;
    
    const event = publicEventsService.createPeaceTreatyEvent(
      faction1,
      faction2,
      currentTurn,
      terms
    );
    
    res.json(event);
  } catch (error) {
    console.error('Erreur lors de la création d\'événement de paix:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/public-events/city-foundation
 * Crée un événement de fondation de ville
 */
router.post('/city-foundation', (req, res) => {
  try {
    const { cityName, founder, currentTurn, location } = req.body;
    
    const event = publicEventsService.createCityFoundationEvent(
      cityName,
      founder,
      currentTurn,
      location
    );
    
    res.json(event);
  } catch (error) {
    console.error('Erreur lors de la création d\'événement de fondation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/public-events/resource-discovery
 * Crée un événement de découverte de ressource
 */
router.post('/resource-discovery', (req, res) => {
  try {
    const { resourceType, discoverer, currentTurn, location, quantity } = req.body;
    
    const event = publicEventsService.createResourceDiscoveryEvent(
      resourceType,
      discoverer,
      currentTurn,
      location,
      quantity
    );
    
    res.json(event);
  } catch (error) {
    console.error('Erreur lors de la création d\'événement de découverte:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/public-events/faction-creation
 * Crée un événement de création de faction
 */
router.post('/faction-creation', (req, res) => {
  try {
    const { factionName, founder, currentTurn, memberCount } = req.body;
    
    const event = publicEventsService.createFactionCreationEvent(
      factionName,
      founder,
      currentTurn,
      memberCount
    );
    
    res.json(event);
  } catch (error) {
    console.error('Erreur lors de la création d\'événement de faction:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/public-events/init-demo
 * Initialise les événements de démonstration
 */
router.post('/init-demo', (req, res) => {
  try {
    const { currentTurn = 1 } = req.body;
    publicEventsService.initializeDemoEvents(currentTurn);
    res.json({ message: 'Événements de démonstration initialisés' });
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des événements de démo:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PATCH /api/public-events/:eventId/visibility
 * Met à jour la visibilité d'un événement
 */
router.patch('/:eventId/visibility', (req, res) => {
  try {
    const { eventId } = req.params;
    const { isVisible } = req.body;
    
    const success = publicEventsService.setEventVisibility(eventId, isVisible);
    
    if (success) {
      res.json({ message: 'Visibilité mise à jour' });
    } else {
      res.status(404).json({ error: 'Événement non trouvé' });
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour de visibilité:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/public-events/:eventId
 * Supprime un événement
 */
router.delete('/:eventId', (req, res) => {
  try {
    const { eventId } = req.params;
    
    const success = publicEventsService.deleteEvent(eventId);
    
    if (success) {
      res.json({ message: 'Événement supprimé' });
    } else {
      res.status(404).json({ error: 'Événement non trouvé' });
    }
  } catch (error) {
    console.error('Erreur lors de la suppression d\'événement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;