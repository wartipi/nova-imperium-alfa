import { Router } from 'express';
import { marshalService } from '../marshalService';
import { 
  createArmyRequestSchema,
  createContractRequestSchema,
  assignMarshalRequestSchema,
  REQUIRED_COMPETENCES
} from '../../shared/marshalSchema';

const router = Router();

router.get('/armies', async (req, res) => {
  try {
    const playerId = 'player';
    
    const armies = await marshalService.getPlayerArmies(playerId);
    res.json(armies);
  } catch (error) {
    console.error('Erreur lors de la récupération des armées:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/armies', async (req, res) => {
  try {
    const playerId = 'player';
    
    const validatedData = createArmyRequestSchema.parse(req.body);
    
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

    const army = await marshalService.createArmy(armyData);
    res.status(201).json(army);
  } catch (error: any) {
    console.error('Erreur lors de la création de l\'armée:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ message: 'Données invalides', errors: error.errors });
    } else {
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }
});

router.put('/armies/:armyId/marshal', async (req, res) => {
  try {
    const { armyId } = req.params;
    const playerId = 'player';
    
    const validatedData = assignMarshalRequestSchema.parse(req.body);
    
    const army = await marshalService.getArmyById(armyId);
    if (!army) {
      return res.status(404).json({ message: 'Armée introuvable' });
    }
    
    if (army.ownerId !== playerId) {
      return res.status(403).json({ message: 'Vous n\'êtes pas le propriétaire de cette armée' });
    }
    
    let marshalId = validatedData.marshalId;
    let marshalName = validatedData.marshalId;
    
    if (validatedData.marshalId === 'self') {
      marshalId = playerId;
      marshalName = 'Vous-même';
    }
    
    const success = await marshalService.assignMarshal(armyId, marshalId, marshalName);
    
    if (success) {
      res.json({ message: 'Maréchal assigné avec succès' });
    } else {
      res.status(500).json({ message: 'Erreur lors de l\'assignation' });
    }
  } catch (error: any) {
    console.error('Erreur lors de l\'assignation du maréchal:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ message: 'Données invalides', errors: error.errors });
    } else {
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }
});

router.delete('/armies/:armyId/marshal', async (req, res) => {
  try {
    const { armyId } = req.params;
    const playerId = 'player';
    
    const army = await marshalService.getArmyById(armyId);
    if (!army || army.ownerId !== playerId) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    
    const success = await marshalService.removeMarshal(armyId);
    
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

router.get('/contracts', async (req, res) => {
  try {
    const playerId = 'player';
    
    const contracts = await marshalService.getPlayerContracts(playerId);
    res.json(contracts);
  } catch (error) {
    console.error('Erreur lors de la récupération des contrats:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/contracts/proposed', async (req, res) => {
  try {
    const playerId = 'player';
    
    const proposedContracts = await marshalService.getProposedContracts(playerId);
    res.json(proposedContracts);
  } catch (error) {
    console.error('Erreur lors de la récupération des contrats proposés:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/contracts', async (req, res) => {
  try {
    const playerId = 'player';
    const playerName = 'Joueur';
    
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
    
    const validatedData = createContractRequestSchema.parse(req.body);
    
    const army = await marshalService.getArmyById(validatedData.armyId);
    if (!army || army.ownerId !== playerId) {
      return res.status(403).json({ 
        message: 'Vous ne pouvez créer un contrat que pour vos propres armées' 
      });
    }
    
    const contractData = {
      employerId: playerId,
      employerName: playerName,
      marshalId: validatedData.marshalId,
      marshalName: 'Joueur Cible',
      armyId: validatedData.armyId,
      armyName: army.name,
      terms: validatedData.terms,
      proposalMessage: validatedData.proposalMessage
    };
    
    const contract = await marshalService.createContract(contractData);
    res.status(201).json(contract);
  } catch (error: any) {
    console.error('Erreur lors de la création du contrat:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ message: 'Données invalides', errors: error.errors });
    } else {
      res.status(500).json({ message: error.message || 'Erreur serveur' });
    }
  }
});

router.put('/contracts/:contractId/accept', async (req, res) => {
  try {
    const { contractId } = req.params;
    const playerId = 'player';
    
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
    
    const success = await marshalService.acceptContract(contractId, playerId);
    
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

router.put('/contracts/:contractId/decline', async (req, res) => {
  try {
    const { contractId } = req.params;
    const playerId = 'player';
    
    const success = await marshalService.declineContract(contractId, playerId);
    
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

router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await marshalService.getAllCampaigns();
    const activeCampaigns = campaigns.filter(c => c.status !== 'cancelled');
    res.json(activeCampaigns);
  } catch (error) {
    console.error('Erreur lors de la récupération des campagnes:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/battles/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const allBattleEvents = await marshalService.getAllBattleEvents();
    const battleEvents = allBattleEvents.filter(battle => battle.campaignId === campaignId);
    
    res.json(battleEvents);
  } catch (error) {
    console.error('Erreur lors de la récupération des batailles:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/player-data', async (req, res) => {
  try {
    const playerId = 'player';
    
    const playerData = await marshalService.getPlayerData(playerId);
    res.json(playerData);
  } catch (error) {
    console.error('Erreur lors de la récupération des données joueur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;
