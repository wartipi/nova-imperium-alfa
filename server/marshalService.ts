import { armies, marshalContracts, campaigns, battleEvents } from "../shared/schema";
import type { 
  Army, 
  MarshalContract, 
  Campaign, 
  BattleEvent,
  InsertArmy,
  InsertMarshalContract,
  InsertCampaign,
  InsertBattleEvent
} from "../shared/schema";

// Service pour la gestion des maréchaux et armées
export class MarshalService {
  private armies: Army[] = [];
  private contracts: MarshalContract[] = [];
  private campaigns: Campaign[] = [];
  private battleEvents: BattleEvent[] = [];

  // === GESTION DES ARMÉES ===
  
  /**
   * Créer une nouvelle armée
   */
  createArmy(armyData: InsertArmy): Army {
    const army: Army = {
      id: `army_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      ...armyData,
      marshalId: null,
      marshalName: null,
      status: 'idle',
      morale: 100,
      experience: 0,
      createdAt: new Date(),
      lastActivity: new Date()
    };

    this.armies.push(army);
    console.log(`🏛️ Nouvelle armée créée: ${army.name} (ID: ${army.id})`);
    return army;
  }

  /**
   * Obtenir toutes les armées d'un joueur
   */
  getPlayerArmies(playerId: string): Army[] {
    return this.armies.filter(army => army.ownerId === playerId);
  }

  /**
   * Obtenir une armée par ID
   */
  getArmyById(armyId: string): Army | null {
    return this.armies.find(army => army.id === armyId) || null;
  }

  /**
   * Assigner un maréchal à une armée
   */
  assignMarshal(armyId: string, marshalId: string, marshalName: string): boolean {
    const army = this.getArmyById(armyId);
    if (!army) {
      console.error(`❌ Armée introuvable: ${armyId}`);
      return false;
    }

    army.marshalId = marshalId;
    army.marshalName = marshalName;
    army.lastActivity = new Date();

    console.log(`⚔️ Maréchal assigné: ${marshalName} -> ${army.name}`);
    return true;
  }

  /**
   * Retirer un maréchal d'une armée
   */
  removeMarshal(armyId: string): boolean {
    const army = this.getArmyById(armyId);
    if (!army) return false;

    const previousMarshal = army.marshalName;
    army.marshalId = null;
    army.marshalName = null;
    army.lastActivity = new Date();

    console.log(`🔄 Maréchal retiré: ${previousMarshal} de ${army.name}`);
    return true;
  }

  // === GESTION DES CONTRATS ===
  
  /**
   * Créer un contrat de maréchal
   */
  createContract(contractData: InsertMarshalContract): MarshalContract {
    // Vérifier que l'armée existe
    const army = this.getArmyById(contractData.armyId);
    if (!army) {
      throw new Error(`Armée introuvable: ${contractData.armyId}`);
    }

    // Vérifier que l'employeur est bien le propriétaire de l'armée
    if (army.ownerId !== contractData.employerId) {
      throw new Error("Seul le propriétaire de l'armée peut créer un contrat");
    }

    // Vérifier les compétences de l'employeur pour créer un contrat
    if (!this.checkCompetenceRequirement(contractData.employerId, 'treaty_knowledge', 1)) {
      throw new Error("Compétence 'treaty_knowledge' niveau 1 requise pour créer un contrat de maréchal");
    }

    // Empêcher la création de contrats multiples pour la même armée
    const existingContract = this.contracts.find(c => 
      c.armyId === contractData.armyId && 
      (c.status === 'proposed' || c.status === 'active')
    );
    
    if (existingContract) {
      throw new Error(`Un contrat actif ou proposé existe déjà pour cette armée: ${existingContract.id}`);
    }

    const contract: MarshalContract = {
      id: `contract_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      ...contractData,
      proposalMessage: contractData.proposalMessage || null,
      status: 'proposed',
      createdAt: new Date(),
      acceptedAt: null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expire dans 7 jours
    };

    this.contracts.push(contract);
    console.log(`📜 Nouveau contrat créé: ${contract.employerName} -> ${contract.marshalName} pour ${contract.armyName}`);
    return contract;
  }

  /**
   * Accepter un contrat
   */
  acceptContract(contractId: string, marshalId: string): boolean {
    const contract = this.contracts.find(c => c.id === contractId);
    if (!contract) {
      console.error(`❌ Contrat introuvable: ${contractId}`);
      return false;
    }

    if (contract.marshalId !== marshalId) {
      console.error(`❌ Seul le maréchal désigné peut accepter ce contrat`);
      return false;
    }

    if (contract.status !== 'proposed') {
      console.error(`❌ Contrat déjà traité: ${contract.status}`);
      return false;
    }

    // Accepter le contrat
    contract.status = 'active';
    contract.acceptedAt = new Date();

    // Assigner le maréchal à l'armée
    this.assignMarshal(contract.armyId, contract.marshalId, contract.marshalName);

    console.log(`✅ Contrat accepté: ${contract.marshalName} dirige ${contract.armyName}`);
    return true;
  }

  /**
   * Refuser un contrat
   */
  declineContract(contractId: string, marshalId: string): boolean {
    const contract = this.contracts.find(c => c.id === contractId);
    if (!contract || contract.marshalId !== marshalId) return false;

    contract.status = 'cancelled';
    console.log(`❌ Contrat refusé: ${contract.marshalName} pour ${contract.armyName}`);
    return true;
  }

  /**
   * Obtenir tous les contrats d'un joueur (en tant qu'employeur ou maréchal)
   */
  getPlayerContracts(playerId: string): MarshalContract[] {
    return this.contracts.filter(c => 
      c.employerId === playerId || c.marshalId === playerId
    );
  }

  /**
   * Obtenir les contrats proposés à un joueur
   */
  getProposedContracts(marshalId: string): MarshalContract[] {
    return this.contracts.filter(c => 
      c.marshalId === marshalId && c.status === 'proposed'
    );
  }

  // === GESTION DES CAMPAGNES ET BATAILLES ===

  /**
   * Créer une nouvelle campagne militaire
   */
  createCampaign(campaignData: InsertCampaign): Campaign {
    const campaign: Campaign = {
      id: `campaign_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      ...campaignData,
      status: 'planning',
      endDate: null,
      createdAt: new Date()
    };

    this.campaigns.push(campaign);
    console.log(`🏛️ Nouvelle campagne créée: ${campaign.name}`);
    return campaign;
  }

  /**
   * Ajouter une armée à une campagne
   */
  joinCampaign(campaignId: string, armyId: string): boolean {
    const campaign = this.campaigns.find(c => c.id === campaignId);
    const army = this.getArmyById(armyId);

    if (!campaign || !army) return false;

    const participatingArmies = campaign.participatingArmies as string[];
    if (!participatingArmies.includes(armyId)) {
      participatingArmies.push(armyId);
      army.status = 'marching';
      army.lastActivity = new Date();
      
      console.log(`⚔️ Armée ${army.name} rejoint la campagne ${campaign.name}`);
    }

    return true;
  }

  /**
   * Créer un événement de bataille
   */
  createBattleEvent(battleData: InsertBattleEvent): BattleEvent {
    const battle: BattleEvent = {
      id: `battle_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      ...battleData,
      status: 'scheduled',
      phase: 'preparation',
      result: null,
      timestamp: new Date(),
      realTimeUpdates: []
    };

    this.battleEvents.push(battle);

    // Mettre les armées participantes en statut 'in_battle'
    const armyIds = battleData.armyIds as string[];
    armyIds.forEach(armyId => {
      const army = this.getArmyById(armyId);
      if (army) {
        army.status = 'in_battle';
        army.lastActivity = new Date();
      }
    });

    console.log(`⚔️ Bataille programmée: ${battle.description}`);
    return battle;
  }

  /**
   * Mettre à jour une bataille en temps réel
   */
  updateBattle(battleId: string, update: {
    type: 'battle_start' | 'phase_change' | 'casualty_report' | 'battle_end';
    message: string;
    data?: any;
  }): boolean {
    const battle = this.battleEvents.find(b => b.id === battleId);
    if (!battle) return false;

    // Mapper le type d'événement à un niveau de sévérité
    const getSeverityFromUpdateType = (updateType: string): 'info' | 'warning' | 'critical' => {
      switch (updateType) {
        case 'battle_start':
        case 'phase_change':
          return 'info';
        case 'casualty_report':
          return 'warning';
        case 'battle_end':
          return 'critical';
        default:
          return 'info';
      }
    };

    const realTimeUpdate = {
      timestamp: new Date(),
      type: update.type, // Le type d'événement original
      severity: getSeverityFromUpdateType(update.type), // Niveau de sévérité séparé
      message: update.message
    };

    const updates = (battle.realTimeUpdates as any[]) || [];
    updates.push(realTimeUpdate);
    battle.realTimeUpdates = updates;

    // Gérer les changements de phase/statut
    if (update.type === 'battle_start') {
      battle.status = 'active';
      battle.phase = 'engagement';
    } else if (update.type === 'battle_end') {
      battle.status = 'completed';
      battle.phase = 'resolution';
      
      // Résoudre le sort des armées et maréchaux
      this.resolveBattleConsequences(battle, update.data);
    }

    console.log(`🔥 Bataille mise à jour: ${battle.id} - ${update.message}`);
    return true;
  }

  /**
   * Résoudre les conséquences d'une bataille
   */
  private resolveBattleConsequences(battle: BattleEvent, result: any): void {
    const armyIds = battle.armyIds as string[];
    
    armyIds.forEach(armyId => {
      const army = this.getArmyById(armyId);
      if (!army) return;

      // Remettre l'armée en statut normal
      army.status = 'returning';
      army.lastActivity = new Date();

      // Appliquer les conséquences selon le résultat
      if (result && result.casualties && result.casualties[armyId]) {
        const casualties = result.casualties[armyId];
        army.totalStrength = Math.max(0, army.totalStrength - casualties);
        
        // Réduire le moral en cas de défaite
        if (result.winner !== army.ownerId) {
          army.morale = Math.max(0, army.morale - 20);
        } else {
          // Augmenter l'expérience en cas de victoire
          army.experience += 10;
          army.morale = Math.min(100, army.morale + 10);
        }
      }

      // Gérer le sort du maréchal
      if (army.marshalId && result.marshalFate && result.marshalFate[army.marshalId]) {
        const fate = result.marshalFate[army.marshalId];
        
        if (fate === 'killed' || fate === 'captured') {
          // Le maréchal subit les conséquences
          this.handleMarshalConsequences(army.marshalId, fate);
          
          // Terminer le contrat si applicable
          const activeContract = this.contracts.find(c => 
            c.armyId === armyId && c.status === 'active'
          );
          if (activeContract) {
            activeContract.status = fate === 'killed' ? 'breached' : 'completed';
          }
          
          // Retirer le maréchal de l'armée
          this.removeMarshal(armyId);
        }
      }
    });

    battle.result = result;
    console.log(`🏆 Conséquences de bataille résolues pour: ${battle.description}`);
  }

  /**
   * Gérer les conséquences pour un maréchal
   */
  private handleMarshalConsequences(marshalId: string, fate: 'killed' | 'captured' | 'wounded' | 'survived'): void {
    // Cette fonction sera étendue selon les besoins du jeu
    // Peut inclure la perte de personnage, réduction de stats, etc.
    console.log(`💀 Maréchal ${marshalId} - Sort: ${fate}`);
  }

  // === MÉTHODES UTILITAIRES ===

  /**
   * Vérifier les compétences requises pour une action
   */
  checkCompetenceRequirement(playerId: string, competence: string, minLevel: number = 1): boolean {
    // TODO: Intégrer avec le système de compétences réel du jeu
    // Cette méthode doit vérifier les compétences réelles du joueur
    // Pour l'instant, nous utilisons une logique simulée basée sur l'ID du joueur
    
    const playerCompetences = this.getSimulatedPlayerCompetences(playerId);
    const playerLevel = playerCompetences[competence] || 0;
    
    console.log(`🎯 Vérification compétence: ${playerId} - ${competence} niveau ${playerLevel}/${minLevel}`);
    return playerLevel >= minLevel;
  }

  /**
   * Méthode temporaire pour simuler les compétences d'un joueur
   * À remplacer par l'intégration au vrai système de compétences
   */
  private getSimulatedPlayerCompetences(playerId: string): Record<string, number> {
    // Simulation basique basée sur l'ID du joueur
    const competences: Record<string, number> = {};
    
    // Attributions par défaut
    competences['leadership'] = 1;
    competences['tactics'] = 1;
    competences['strategy'] = 1;
    competences['logistics'] = 1;
    competences['treaty_knowledge'] = 0; // Compétence pour créer des contrats
    
    // Bonus selon l'ID (simulation)
    if (playerId.includes('marshal') || playerId.includes('commander')) {
      competences['leadership'] = 3;
      competences['tactics'] = 2;
      competences['treaty_knowledge'] = 2;
    }
    
    if (playerId.includes('strategic') || playerId.includes('general')) {
      competences['strategy'] = 3;
      competences['logistics'] = 2;
      competences['treaty_knowledge'] = 1;
    }
    
    // Joueurs avec 'admin' ou 'noble' ont accès aux traités
    if (playerId.includes('admin') || playerId.includes('noble') || playerId.includes('lord')) {
      competences['treaty_knowledge'] = 3;
    }
    
    return competences;
  }

  /**
   * Calculer le coût d'un contrat basé sur les risques
   */
  calculateContractCost(riskLevel: 'low' | 'medium' | 'high', duration: number, armyStrength: number): number {
    const baseRate = {
      low: 10,
      medium: 25,
      high: 50
    };

    const riskMultiplier = baseRate[riskLevel];
    const strengthBonus = Math.floor(armyStrength / 100) * 5;
    
    return (riskMultiplier + strengthBonus) * duration;
  }

  /**
   * Obtenir toutes les données pour un joueur
   */
  getPlayerData(playerId: string) {
    return {
      armies: this.getPlayerArmies(playerId),
      contracts: this.getPlayerContracts(playerId),
      proposedContracts: this.getProposedContracts(playerId),
      activeCampaigns: this.campaigns.filter(c => 
        c.status === 'active' && 
        this.getPlayerArmies(playerId).some(army => 
          (c.participatingArmies as string[]).includes(army.id)
        )
      )
    };
  }

  // === MÉTHODES DE DONNÉES ===
  
  getAllArmies(): Army[] {
    return this.armies;
  }

  getAllContracts(): MarshalContract[] {
    return this.contracts;
  }

  getAllCampaigns(): Campaign[] {
    return this.campaigns;
  }

  getAllBattleEvents(): BattleEvent[] {
    return this.battleEvents;
  }
}

export const marshalService = new MarshalService();