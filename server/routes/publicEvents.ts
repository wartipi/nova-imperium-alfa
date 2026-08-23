import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';
import { publicEventsService } from '../publicEventsService';
import { EventFilter } from '../../shared/publicEventsSchema';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res) => {
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

router.get('/recent/:turn', requireAuth, async (req: AuthRequest, res) => {
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

router.get('/priority/:priority', requireAuth, async (req: AuthRequest, res) => {
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

router.get('/participant/:participantId', requireAuth, async (req: AuthRequest, res) => {
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

router.get('/statistics', requireAuth, async (req: AuthRequest, res) => {
  try {
    const stats = await publicEventsService.getEventStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/init-demo', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { currentTurn = 1 } = req.body;
    await publicEventsService.initializeDemoEvents(currentTurn);
    res.json({ message: 'Événements de démonstration initialisés' });
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des événements de démo:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.patch('/:eventId/visibility', requireAuth, async (req: AuthRequest, res) => {
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

router.delete('/:eventId', requireAuth, async (req: AuthRequest, res) => {
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
