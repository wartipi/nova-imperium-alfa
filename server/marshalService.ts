import { eq, and, or, inArray } from "drizzle-orm";
import { db } from "./db";
import { 
  armies, 
  marshalContracts, 
  campaigns, 
  battleEvents 
} from "../shared/schema";
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

export class MarshalService {
  
  async createArmy(armyData: InsertArmy): Promise<Army> {
    const id = `army_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    const [army] = await db.insert(armies).values({
      id,
      name: armyData.name,
      ownerId: armyData.ownerId,
      units: armyData.units,
      composition: armyData.composition,
      totalStrength: armyData.totalStrength,
      position: armyData.position ?? { x: 0, y: 0 },
      marshalId: null,
      marshalName: null,
      status: 'idle',
      morale: 100,
      experience: 0,
      createdAt: new Date(),
      lastActivity: new Date()
    }).returning();

    console.log(`🏛️ Nouvelle armée créée: ${army.name} (ID: ${army.id})`);
    return army;
  }

  async getPlayerArmies(playerId: string): Promise<Army[]> {
    return await db.select().from(armies).where(eq(armies.ownerId, playerId));
  }

  async getArmyById(armyId: string): Promise<Army | null> {
    const [army] = await db.select().from(armies).where(eq(armies.id, armyId));
    return army || null;
  }

  async assignMarshal(armyId: string, marshalId: string, marshalName: string): Promise<boolean> {
    const army = await this.getArmyById(armyId);
    if (!army) {
      console.error(`❌ Armée introuvable: ${armyId}`);
      return false;
    }

    await db.update(armies)
      .set({ 
        marshalId, 
        marshalName, 
        lastActivity: new Date() 
      })
      .where(eq(armies.id, armyId));

    console.log(`⚔️ Maréchal assigné: ${marshalName} -> ${army.name}`);
    return true;
  }

  async removeMarshal(armyId: string): Promise<boolean> {
    const army = await this.getArmyById(armyId);
    if (!army) return false;

    const previousMarshal = army.marshalName;
    
    await db.update(armies)
      .set({ 
        marshalId: null, 
        marshalName: null, 
        lastActivity: new Date() 
      })
      .where(eq(armies.id, armyId));

    console.log(`🔄 Maréchal retiré: ${previousMarshal} de ${army.name}`);
    return true;
  }

  async createContract(contractData: InsertMarshalContract): Promise<MarshalContract> {
    const army = await this.getArmyById(contractData.armyId);
    if (!army) {
      throw new Error(`Armée introuvable: ${contractData.armyId}`);
    }

    if (army.ownerId !== contractData.employerId) {
      throw new Error("Seul le propriétaire de l'armée peut créer un contrat");
    }

    if (!this.checkCompetenceRequirement(contractData.employerId, 'treaty_knowledge', 1)) {
      throw new Error("Compétence 'treaty_knowledge' niveau 1 requise pour créer un contrat de maréchal");
    }

    const existingContracts = await db.select().from(marshalContracts)
      .where(and(
        eq(marshalContracts.armyId, contractData.armyId),
        or(
          eq(marshalContracts.status, 'proposed'),
          eq(marshalContracts.status, 'active')
        )
      ));
    
    if (existingContracts.length > 0) {
      throw new Error(`Un contrat actif ou proposé existe déjà pour cette armée: ${existingContracts[0].id}`);
    }

    const id = `contract_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    const [contract] = await db.insert(marshalContracts).values({
      id,
      employerId: contractData.employerId,
      employerName: contractData.employerName,
      marshalId: contractData.marshalId,
      marshalName: contractData.marshalName,
      armyId: contractData.armyId,
      armyName: contractData.armyName,
      terms: contractData.terms,
      proposalMessage: contractData.proposalMessage || null,
      status: 'proposed',
      createdAt: new Date(),
      acceptedAt: null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }).returning();

    console.log(`📜 Nouveau contrat créé: ${contract.employerName} -> ${contract.marshalName} pour ${contract.armyName}`);
    return contract;
  }

  async acceptContract(contractId: string, marshalId: string): Promise<boolean> {
    const [contract] = await db.select().from(marshalContracts)
      .where(eq(marshalContracts.id, contractId));
    
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

    await db.update(marshalContracts)
      .set({ 
        status: 'active', 
        acceptedAt: new Date() 
      })
      .where(eq(marshalContracts.id, contractId));

    await this.assignMarshal(contract.armyId, contract.marshalId, contract.marshalName);

    console.log(`✅ Contrat accepté: ${contract.marshalName} dirige ${contract.armyName}`);
    return true;
  }

  async declineContract(contractId: string, marshalId: string): Promise<boolean> {
    const [contract] = await db.select().from(marshalContracts)
      .where(eq(marshalContracts.id, contractId));
    
    if (!contract || contract.marshalId !== marshalId) return false;

    await db.update(marshalContracts)
      .set({ status: 'cancelled' })
      .where(eq(marshalContracts.id, contractId));

    console.log(`❌ Contrat refusé: ${contract.marshalName} pour ${contract.armyName}`);
    return true;
  }

  async getPlayerContracts(playerId: string): Promise<MarshalContract[]> {
    return await db.select().from(marshalContracts)
      .where(or(
        eq(marshalContracts.employerId, playerId),
        eq(marshalContracts.marshalId, playerId)
      ));
  }

  async getProposedContracts(marshalId: string): Promise<MarshalContract[]> {
    return await db.select().from(marshalContracts)
      .where(and(
        eq(marshalContracts.marshalId, marshalId),
        eq(marshalContracts.status, 'proposed')
      ));
  }

  async createCampaign(campaignData: InsertCampaign): Promise<Campaign> {
    const id = `campaign_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    const [campaign] = await db.insert(campaigns).values({
      id,
      name: campaignData.name,
      organizerId: campaignData.organizerId,
      participatingArmies: campaignData.participatingArmies,
      startDate: campaignData.startDate,
      rules: campaignData.rules,
      status: 'planning',
      endDate: null,
      createdAt: new Date()
    }).returning();

    console.log(`🏛️ Nouvelle campagne créée: ${campaign.name}`);
    return campaign;
  }

  async joinCampaign(campaignId: string, armyId: string): Promise<boolean> {
    const [campaign] = await db.select().from(campaigns)
      .where(eq(campaigns.id, campaignId));
    const army = await this.getArmyById(armyId);

    if (!campaign || !army) return false;

    const participatingArmies = campaign.participatingArmies as string[];
    if (!participatingArmies.includes(armyId)) {
      participatingArmies.push(armyId);
      
      await db.update(campaigns)
        .set({ participatingArmies })
        .where(eq(campaigns.id, campaignId));
      
      await db.update(armies)
        .set({ status: 'marching', lastActivity: new Date() })
        .where(eq(armies.id, armyId));
      
      console.log(`⚔️ Armée ${army.name} rejoint la campagne ${campaign.name}`);
    }

    return true;
  }

  async createBattleEvent(battleData: InsertBattleEvent): Promise<BattleEvent> {
    const id = `battle_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    const [battle] = await db.insert(battleEvents).values({
      id,
      campaignId: battleData.campaignId,
      armyIds: battleData.armyIds,
      description: battleData.description,
      status: 'scheduled',
      phase: 'preparation',
      result: null,
      timestamp: new Date(),
      realTimeUpdates: []
    }).returning();

    const armyIds = battleData.armyIds as string[];
    if (armyIds.length > 0) {
      await db.update(armies)
        .set({ status: 'in_battle', lastActivity: new Date() })
        .where(inArray(armies.id, armyIds));
    }

    console.log(`⚔️ Bataille programmée: ${battle.description}`);
    return battle;
  }

  async updateBattle(battleId: string, update: {
    type: 'battle_start' | 'phase_change' | 'casualty_report' | 'battle_end';
    message: string;
    data?: any;
  }): Promise<boolean> {
    const [battle] = await db.select().from(battleEvents)
      .where(eq(battleEvents.id, battleId));
    
    if (!battle) return false;

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
      type: update.type,
      severity: getSeverityFromUpdateType(update.type),
      message: update.message
    };

    const updates = (battle.realTimeUpdates as any[]) || [];
    updates.push(realTimeUpdate);

    let newStatus = battle.status;
    let newPhase = battle.phase;

    if (update.type === 'battle_start') {
      newStatus = 'active';
      newPhase = 'engagement';
    } else if (update.type === 'battle_end') {
      newStatus = 'completed';
      newPhase = 'resolution';
      await this.resolveBattleConsequences(battle, update.data);
    }

    await db.update(battleEvents)
      .set({ 
        realTimeUpdates: updates,
        status: newStatus,
        phase: newPhase,
        result: update.type === 'battle_end' ? update.data : battle.result
      })
      .where(eq(battleEvents.id, battleId));

    console.log(`🔥 Bataille mise à jour: ${battle.id} - ${update.message}`);
    return true;
  }

  private async resolveBattleConsequences(battle: BattleEvent, result: any): Promise<void> {
    const armyIds = battle.armyIds as string[];
    
    for (const armyId of armyIds) {
      const army = await this.getArmyById(armyId);
      if (!army) continue;

      let newStrength = army.totalStrength;
      let newMorale = army.morale;
      let newExperience = army.experience;

      if (result && result.casualties && result.casualties[armyId]) {
        const casualties = result.casualties[armyId];
        newStrength = Math.max(0, army.totalStrength - casualties);
        
        if (result.winner !== army.ownerId) {
          newMorale = Math.max(0, army.morale - 20);
        } else {
          newExperience += 10;
          newMorale = Math.min(100, army.morale + 10);
        }
      }

      await db.update(armies)
        .set({ 
          status: 'returning', 
          lastActivity: new Date(),
          totalStrength: newStrength,
          morale: newMorale,
          experience: newExperience
        })
        .where(eq(armies.id, armyId));

      if (army.marshalId && result?.marshalFate?.[army.marshalId]) {
        const fate = result.marshalFate[army.marshalId];
        
        if (fate === 'killed' || fate === 'captured') {
          this.handleMarshalConsequences(army.marshalId, fate);
          
          const activeContracts = await db.select().from(marshalContracts)
            .where(and(
              eq(marshalContracts.armyId, armyId),
              eq(marshalContracts.status, 'active')
            ));
          
          if (activeContracts.length > 0) {
            await db.update(marshalContracts)
              .set({ status: fate === 'killed' ? 'breached' : 'completed' })
              .where(eq(marshalContracts.id, activeContracts[0].id));
          }
          
          await this.removeMarshal(armyId);
        }
      }
    }

    console.log(`🏆 Conséquences de bataille résolues pour: ${battle.description}`);
  }

  private handleMarshalConsequences(marshalId: string, fate: 'killed' | 'captured' | 'wounded' | 'survived'): void {
    console.log(`💀 Maréchal ${marshalId} - Sort: ${fate}`);
  }

  checkCompetenceRequirement(playerId: string, competence: string, minLevel: number = 1): boolean {
    const playerCompetences = this.getSimulatedPlayerCompetences(playerId);
    const playerLevel = playerCompetences[competence] || 0;
    
    console.log(`🎯 Vérification compétence: ${playerId} - ${competence} niveau ${playerLevel}/${minLevel}`);
    return playerLevel >= minLevel;
  }

  private getSimulatedPlayerCompetences(playerId: string): Record<string, number> {
    const competences: Record<string, number> = {};
    
    competences['leadership'] = 1;
    competences['tactics'] = 1;
    competences['strategy'] = 1;
    competences['logistics'] = 1;
    competences['treaty_knowledge'] = 0;
    
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
    
    if (playerId.includes('admin') || playerId.includes('noble') || playerId.includes('lord')) {
      competences['treaty_knowledge'] = 3;
    }
    
    return competences;
  }

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

  async getPlayerData(playerId: string) {
    const playerArmies = await this.getPlayerArmies(playerId);
    const playerContracts = await this.getPlayerContracts(playerId);
    const proposedContracts = await this.getProposedContracts(playerId);
    
    const playerArmyIds = playerArmies.map(a => a.id);
    const activeCampaigns = await db.select().from(campaigns)
      .where(eq(campaigns.status, 'active'));
    
    const relevantCampaigns = activeCampaigns.filter(c => {
      const participatingArmies = c.participatingArmies as string[];
      return playerArmyIds.some(id => participatingArmies.includes(id));
    });

    return {
      armies: playerArmies,
      contracts: playerContracts,
      proposedContracts,
      activeCampaigns: relevantCampaigns
    };
  }

  async getAllArmies(): Promise<Army[]> {
    return await db.select().from(armies);
  }

  async getAllContracts(): Promise<MarshalContract[]> {
    return await db.select().from(marshalContracts);
  }

  async getAllCampaigns(): Promise<Campaign[]> {
    return await db.select().from(campaigns);
  }

  async getAllBattleEvents(): Promise<BattleEvent[]> {
    return await db.select().from(battleEvents);
  }
}

export const marshalService = new MarshalService();
