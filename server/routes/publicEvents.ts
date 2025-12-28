import { Router, Response } from 'express';
import { publicEventsService } from '../publicEventsService';
import { EventFilter } from '../../shared/publicEventsSchema';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req, res) => {
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
      filter.types = typeArray as any[];
    }
    if (priorities) {
      const priorityArray = Array.isArray(priorities) ? priorities : [priorities];
      filter.priorities = priorityArray as any[];
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

    const events = await publicEventsService.getEvents(
      filter, 
      limit ? parseInt(limit as string) : undefined
    );

    res.json(events);
  } catch (error) {
    console.error('Erreur lors de la récupération des événements:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/recent/:turn', async (req, res) => {
  try {
    const currentTurn = parseInt(req.params.turn);
    const { turnsBack = '5', limit = '20' } = req.query;
    
    const events = await publicEventsService.getRecentEvents(
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

router.get('/priority/:priority', async (req, res) => {
  try {
    const { priority } = req.params;
    const { limit } = req.query;
    
    const events = await publicEventsService.getEventsByPriority(
      priority as any,
      limit ? parseInt(limit as string) : undefined
    );
    
    res.json(events);
  } catch (error) {
    console.error('Erreur lors de la récupération par priorité:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/nearby', async (req, res) => {
  try {
    const { x, y, radius, limit } = req.query;
    
    if (!x || !y || !radius) {
      return res.status(400).json({ error: 'x, y, and radius are required' });
    }
    
    const events = await publicEventsService.findNearbyEvents(
      parseFloat(x as string),
      parseFloat(y as string),
      parseFloat(radius as string),
      limit ? parseInt(limit as string) : 20
    );
    
    res.json(events);
  } catch (error) {
    console.error('Erreur lors de la recherche géospatiale:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/participant/:participantId', async (req, res) => {
  try {
    const { participantId } = req.params;
    const { limit } = req.query;
    
    const events = await publicEventsService.getEventsForParticipant(
      participantId,
      limit ? parseInt(limit as string) : undefined
    );
    
    res.json(events);
  } catch (error) {
    console.error('Erreur lors de la récupération par participant:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/statistics', async (req, res) => {
  try {
    const stats = await publicEventsService.getEventStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/alliance', requireAuth, requireRole('admin', 'gm'), async (req: AuthRequest, res: Response) => {
  try {
    const { faction1, faction2, allianceType, currentTurn, terms } = req.body;
    
    const event = await publicEventsService.createAllianceEvent(
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

router.post('/campaign', requireAuth, requireRole('admin', 'gm'), async (req: AuthRequest, res: Response) => {
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
    
    const event = await publicEventsService.createCampaignEvent(
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

router.post('/war-declaration', requireAuth, requireRole('admin', 'gm'), async (req: AuthRequest, res: Response) => {
  try {
    const { aggressor, target, currentTurn, reason } = req.body;
    
    const event = await publicEventsService.createWarDeclarationEvent(
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

router.post('/peace-treaty', requireAuth, requireRole('admin', 'gm'), async (req: AuthRequest, res: Response) => {
  try {
    const { faction1, faction2, currentTurn, terms } = req.body;
    
    const event = await publicEventsService.createPeaceTreatyEvent(
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

router.post('/city-foundation', requireAuth, requireRole('admin', 'gm'), async (req: AuthRequest, res: Response) => {
  try {
    const { cityName, founder, currentTurn, location } = req.body;
    
    const event = await publicEventsService.createCityFoundationEvent(
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

router.post('/resource-discovery', requireAuth, requireRole('admin', 'gm'), async (req: AuthRequest, res: Response) => {
  try {
    const { resourceType, discoverer, currentTurn, location, quantity } = req.body;
    
    const event = await publicEventsService.createResourceDiscoveryEvent(
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

router.post('/faction-creation', requireAuth, requireRole('admin', 'gm'), async (req: AuthRequest, res: Response) => {
  try {
    const { factionName, founder, currentTurn, memberCount } = req.body;
    
    const event = await publicEventsService.createFactionCreationEvent(
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

router.post('/init-demo', requireAuth, requireRole('admin', 'gm'), async (req: AuthRequest, res: Response) => {
  try {
    const { currentTurn = 1 } = req.body;
    await publicEventsService.initializeDemoEvents(currentTurn);
    res.json({ message: 'Événements de démonstration initialisés' });
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des événements de démo:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.patch('/:eventId/visibility', requireAuth, requireRole('admin', 'gm'), async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const { isVisible } = req.body;
    
    const success = await publicEventsService.setEventVisibility(eventId, isVisible);
    
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

router.delete('/:eventId', requireAuth, requireRole('admin', 'gm'), async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    
    const success = await publicEventsService.deleteEvent(eventId);
    
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
