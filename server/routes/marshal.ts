import { Router } from 'express';
import { marshalService } from '../marshalService';
import { 
  createArmyRequestSchema,
  createContractRequestSchema,
  assignMarshalRequestSchema,
  REQUIRED_COMPETENCES
} from '../../shared/marshalSchema';

const router = Router();

// === ROUTES POUR LES ARMÉES ===

/**
 * GET /api/marshal/armies
 * Obtenir toutes les armées du joueur
 */
router.get('/armies', (req, res) => {
  try {
    // TODO: Récupérer l'ID du joueur depuis la session
    const playerId = 'player'; // Temporaire
    
    const armies = marshalService.getPlayerArmies(playerId);
    res.json(armies);
  } catch (error) {
    console.error('Erreur lors de la récupération des armées:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/marshal/armies
 * Créer une nouvelle armée
 */
router.post('/armies', (req, res) => {
  try {
    // TODO: Récupérer l'ID du joueur depuis la session
    const playerId = 'player'; // Temporaire
    
    // Valider les données de la requête
    const validatedData = createArmyRequestSchema.parse(req.body);
    
    // Calculer la force totale et la composition
    const composition = {
      infantry: Math.floor(Math.random() * 100) + 50,
      cavalry: Math.floor(Math.random() * 50) + 20,
      archers: Math.floor(Math.random() * 80) + 30,
      siege: Math.floor(Math.random() * 20) + 5
    };
    
    const totalStrength = composition.infantry + composition.cavalry + 
                         composition.archers + composition.siege;
    
    const armyData = {
      name: validatedData.name,
      ownerId: playerId,
      units: validatedData.unitIds,
      composition,
      totalStrength,
      position: validatedData.position || null
    };

    const army = marshalService.createArmy(armyData);
    res.status(201).json(army);
  } catch (error) {
    console.error('Erreur lors de la création de l\'armée:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ message: 'Données invalides', errors: error.errors });
    } else {
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }
});

/**
 * PUT /api/marshal/armies/:armyId/marshal
 * Assigner un maréchal à une armée
 */
router.put('/armies/:armyId/marshal', (req, res) => {
  try {
    const { armyId } = req.params;
    // TODO: Récupérer l'ID du joueur depuis la session
    const playerId = 'player'; // Temporaire
    
    const validatedData = assignMarshalRequestSchema.parse(req.body);
    
    // Vérifier que l'armée appartient au joueur
    const army = marshalService.getArmyById(armyId);
    if (!army) {
      return res.status(404).json({ message: 'Armée introuvable' });
    }
    
    if (army.ownerId !== playerId) {
      return res.status(403).json({ message: 'Vous n\'êtes pas le propriétaire de cette armée' });
    }
    
    let marshalId = validatedData.marshalId;
    let marshalName = validatedData.marshalId; // Temporaire, à remplacer par le vrai nom
    
    // Si "self", le joueur se désigne lui-même
    if (validatedData.marshalId === 'self') {
      marshalId = playerId;
      marshalName = 'Vous-même'; // Temporaire
    }
    
    const success = marshalService.assignMarshal(armyId, marshalId, marshalName);
    
    if (success) {
      res.json({ message: 'Maréchal assigné avec succès' });
    } else {
      res.status(500).json({ message: 'Erreur lors de l\'assignation' });
    }
  } catch (error) {
    console.error('Erreur lors de l\'assignation du maréchal:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ message: 'Données invalides', errors: error.errors });
    } else {
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }
});

/**
 * DELETE /api/marshal/armies/:armyId/marshal
 * Retirer un maréchal d'une armée
 */
router.delete('/armies/:armyId/marshal', (req, res) => {
  try {
    const { armyId } = req.params;
    // TODO: Récupérer l'ID du joueur depuis la session
    const playerId = 'player'; // Temporaire
    
    // Vérifier que l'armée appartient au joueur
    const army = marshalService.getArmyById(armyId);
    if (!army || army.ownerId !== playerId) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    
    const success = marshalService.removeMarshal(armyId);
    
    if (success) {
      res.json({ message: 'Maréchal retiré avec succès' });
    } else {
      res.status(500).json({ message: 'Erreur lors du retrait' });
    }
  } catch (error) {
    console.error('Erreur lors du retrait du maréchal:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// === ROUTES POUR LES CONTRATS ===

/**
 * GET /api/marshal/contracts
 * Obtenir tous les contrats du joueur
 */
router.get('/contracts', (req, res) => {
  try {
    // TODO: Récupérer l'ID du joueur depuis la session
    const playerId = 'player'; // Temporaire
    
    const contracts = marshalService.getPlayerContracts(playerId);
    res.json(contracts);
  } catch (error) {
    console.error('Erreur lors de la récupération des contrats:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * GET /api/marshal/contracts/proposed
 * Obtenir les contrats proposés au joueur
 */
router.get('/contracts/proposed', (req, res) => {
  try {
    // TODO: Récupérer l'ID du joueur depuis la session
    const playerId = 'player'; // Temporaire
    
    const proposedContracts = marshalService.getProposedContracts(playerId);
    res.json(proposedContracts);
  } catch (error) {
    console.error('Erreur lors de la récupération des contrats proposés:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/marshal/contracts
 * Créer un nouveau contrat de maréchal
 */
router.post('/contracts', (req, res) => {
  try {
    // TODO: Récupérer l'ID du joueur depuis la session
    const playerId = 'player'; // Temporaire
    const playerName = 'Joueur'; // Temporaire
    
    // Vérifier la compétence requise : Connaissance des traités niveau 1
    const hasRequiredCompetence = marshalService.checkCompetenceRequirement(
      playerId, 
      REQUIRED_COMPETENCES.CREATE_CONTRACT, 
      1
    );
    
    if (!hasRequiredCompetence) {
      return res.status(403).json({ 
        message: 'Compétence requise: Connaissance des traités (niveau 1)' 
      });
    }
    
    // Valider les données de la requête
    const validatedData = createContractRequestSchema.parse(req.body);
    
    // Vérifier que l'armée appartient au joueur
    const army = marshalService.getArmyById(validatedData.armyId);
    if (!army || army.ownerId !== playerId) {
      return res.status(403).json({ 
        message: 'Vous ne pouvez créer un contrat que pour vos propres armées' 
      });
    }
    
    const contractData = {
      employerId: playerId,
      employerName: playerName,
      marshalId: validatedData.marshalId,
      marshalName: 'Joueur Cible', // TODO: Récupérer le vrai nom
      armyId: validatedData.armyId,
      armyName: army.name,
      terms: validatedData.terms,
      proposalMessage: validatedData.proposalMessage
    };
    
    const contract = marshalService.createContract(contractData);
    res.status(201).json(contract);
  } catch (error) {
    console.error('Erreur lors de la création du contrat:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ message: 'Données invalides', errors: error.errors });
    } else {
      res.status(500).json({ message: error.message || 'Erreur serveur' });
    }
  }
});

/**
 * PUT /api/marshal/contracts/:contractId/accept
 * Accepter un contrat de maréchal
 */
router.put('/contracts/:contractId/accept', (req, res) => {
  try {
    const { contractId } = req.params;
    // TODO: Récupérer l'ID du joueur depuis la session
    const playerId = 'player'; // Temporaire
    
    // Vérifier la compétence requise : Commandement niveau 1
    const hasRequiredCompetence = marshalService.checkCompetenceRequirement(
      playerId, 
      REQUIRED_COMPETENCES.MARSHAL_ARMY, 
      1
    );
    
    if (!hasRequiredCompetence) {
      return res.status(403).json({ 
        message: 'Compétence requise: Commandement (niveau 1)' 
      });
    }
    
    const success = marshalService.acceptContract(contractId, playerId);
    
    if (success) {
      res.json({ message: 'Contrat accepté avec succès' });
    } else {
      res.status(400).json({ message: 'Impossible d\'accepter ce contrat' });
    }
  } catch (error) {
    console.error('Erreur lors de l\'acceptation du contrat:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * PUT /api/marshal/contracts/:contractId/decline
 * Refuser un contrat de maréchal
 */
router.put('/contracts/:contractId/decline', (req, res) => {
  try {
    const { contractId } = req.params;
    // TODO: Récupérer l'ID du joueur depuis la session
    const playerId = 'player'; // Temporaire
    
    const success = marshalService.declineContract(contractId, playerId);
    
    if (success) {
      res.json({ message: 'Contrat refusé' });
    } else {
      res.status(400).json({ message: 'Impossible de refuser ce contrat' });
    }
  } catch (error) {
    console.error('Erreur lors du refus du contrat:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// === ROUTES POUR LES CAMPAGNES ===

/**
 * GET /api/marshal/campaigns
 * Obtenir toutes les campagnes actives
 */
router.get('/campaigns', (req, res) => {
  try {
    const campaigns = marshalService.getAllCampaigns();
    const activeCampaigns = campaigns.filter(c => c.status !== 'cancelled');
    res.json(activeCampaigns);
  } catch (error) {
    console.error('Erreur lors de la récupération des campagnes:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * GET /api/marshal/battles/:campaignId
 * Obtenir les événements de bataille d'une campagne
 */
router.get('/battles/:campaignId', (req, res) => {
  try {
    const { campaignId } = req.params;
    const battleEvents = marshalService.getAllBattleEvents()
      .filter(battle => battle.campaignId === campaignId);
    
    res.json(battleEvents);
  } catch (error) {
    console.error('Erreur lors de la récupération des batailles:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * GET /api/marshal/player-data
 * Obtenir toutes les données de maréchalat pour un joueur
 */
router.get('/player-data', (req, res) => {
  try {
    // TODO: Récupérer l'ID du joueur depuis la session
    const playerId = 'player'; // Temporaire
    
    const playerData = marshalService.getPlayerData(playerId);
    res.json(playerData);
  } catch (error) {
    console.error('Erreur lors de la récupération des données joueur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;