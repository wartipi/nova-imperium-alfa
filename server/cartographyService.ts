import { eq, and, lt, gt, gte, lte, sql, asc, desc } from "drizzle-orm";
import { db } from "./db";
import { 
  mapRegions, 
  mapDocuments, 
  cartographyProjects 
} from "../shared/schema";
import type { 
  MapRegion, 
  MapDocument, 
  CartographyProject,
  InsertMapRegion,
  InsertMapDocument,
  InsertCartographyProject
} from "../shared/schema";
import { 
  createBoundingBoxCondition, 
  createDistanceCondition,
  orderByDistanceSQL 
} from "./utils/geospatial";

class CartographyService {
  private subscribers: Map<string, Array<(data: any) => void>> = new Map();

  async discoverRegion(
    playerId: string,
    centerX: number,
    centerY: number,
    radius: number,
    name: string
  ): Promise<MapRegion | null> {
    const existingRegion = await this.findRegionAt(centerX, centerY, radius);
    if (existingRegion) {
      return existingRegion;
    }

    const tiles = this.exploreTiles(centerX, centerY, radius);
    const id = `region_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const [region] = await db.insert(mapRegions).values({
      id,
      name,
      centerX,
      centerY,
      radius,
      tiles,
      exploredBy: playerId,
      explorationLevel: 25,
      createdAt: new Date()
    }).returning();

    this.notifySubscribers(playerId, {
      type: 'region_discovered',
      region
    });

    return region;
  }

  async startCartographyProject(
    playerId: string,
    regionId: string,
    tools: string[] = [],
    assistants: string[] = []
  ): Promise<CartographyProject | null> {
    const [region] = await db.select().from(mapRegions)
      .where(eq(mapRegions.id, regionId));
    
    if (!region) return null;

    const baseActionPoints = region.radius * 10;
    const toolsBonus = tools.length * 2;
    const assistantsBonus = assistants.length * 5;
    const requiredActionPoints = Math.max(baseActionPoints - toolsBonus - assistantsBonus, 20);

    const id = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const [project] = await db.insert(cartographyProjects).values({
      id,
      playerId,
      regionId,
      progress: 0,
      requiredActionPoints,
      spentActionPoints: 0,
      startedAt: new Date(),
      estimatedCompletion: new Date(Date.now() + (requiredActionPoints * 60 * 1000)),
      tools,
      assistants
    }).returning();

    this.notifySubscribers(playerId, {
      type: 'project_started',
      project
    });

    return project;
  }

  /**
   * Fait progresser un projet de cartographie en dépensant des points d'action.
   * 
   * Cette méthode gère la progression d'un projet de création de carte :
   * 
   * 1. Calcule le nouveau pourcentage de progression
   * 2. Met à jour les points d'action dépensés
   * 3. Si le projet atteint 100%, crée automatiquement le document de carte
   * 
   * Le document de carte créé inclut :
   * - Qualité (rough/detailed/masterwork) basée sur les outils utilisés
   * - Précision (60-95%) selon la qualité
   * - Secrets cachés découverts
   * - Caractéristiques uniques de la région
   * - Valeur commerciale pour le trading
   * 
   * Toutes les opérations sont effectuées dans une transaction atomique.
   * Le joueur est notifié en temps réel de la progression ou de la complétion.
   * 
   * @param projectId - ID du projet de cartographie
   * @param actionPointsSpent - Nombre de points d'action à dépenser
   * @returns true si la progression a réussi, false si le projet n'existe pas
   */
  async progressProject(projectId: string, actionPointsSpent: number): Promise<boolean> {
    const [project] = await db.select().from(cartographyProjects)
      .where(eq(cartographyProjects.id, projectId));
    
    if (!project) return false;

    const newSpentActionPoints = project.spentActionPoints + actionPointsSpent;
    const newProgress = Math.min((newSpentActionPoints / project.requiredActionPoints) * 100, 100);

    let mapDocument: MapDocument | null = null;

    await db.transaction(async (tx) => {
      await tx.update(cartographyProjects)
        .set({ 
          spentActionPoints: newSpentActionPoints, 
          progress: Math.floor(newProgress) 
        })
        .where(eq(cartographyProjects.id, projectId));

      if (newProgress >= 100) {
        mapDocument = await this.createMapDocumentInTx(tx, project);
      }
    });

    if (newProgress >= 100 && mapDocument) {
      this.notifySubscribers(project.playerId, {
        type: 'map_completed',
        map: mapDocument,
        project
      });
    } else if (newProgress < 100) {
      this.notifySubscribers(project.playerId, {
        type: 'project_progress',
        project: { ...project, progress: newProgress, spentActionPoints: newSpentActionPoints }
      });
    }

    return true;
  }

  private async createMapDocument(project: CartographyProject): Promise<MapDocument | null> {
    return this.createMapDocumentInTx(db, project);
  }

  private async createMapDocumentInTx(tx: any, project: CartographyProject): Promise<MapDocument | null> {
    const [region] = await tx.select().from(mapRegions)
      .where(eq(mapRegions.id, project.regionId));
    
    if (!region) return null;

    const tools = project.tools as string[];
    const assistants = project.assistants as string[];

    let quality: 'rough' | 'detailed' | 'masterwork' = 'rough';
    let accuracy = 60;

    if (tools.includes('precision_compass') && tools.includes('surveyor_tools')) {
      quality = 'detailed';
      accuracy = 80;
    }

    if (assistants.length >= 2 && tools.includes('masterwork_instruments')) {
      quality = 'masterwork';
      accuracy = 95;
    }

    const hiddenSecrets = this.discoverSecrets(region, quality);
    const uniqueFeatures = this.identifyUniqueFeatures(region, quality);
    const tradingValue = this.calculateTradingValue(region, quality, accuracy, hiddenSecrets.length);

    const existingMaps = await tx.select().from(mapDocuments)
      .where(and(
        eq(mapDocuments.regionId, region.id),
        eq(mapDocuments.quality, quality)
      ));
    const isUnique = existingMaps.length === 0;

    const id = `map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const [mapDocument] = await tx.insert(mapDocuments).values({
      id,
      name: `Carte de ${region.name}`,
      regionId: region.id,
      cartographer: project.playerId,
      quality,
      accuracy,
      hiddenSecrets,
      tradingValue,
      uniqueFeatures,
      createdAt: new Date(),
      lastUpdated: new Date(),
      isUnique
    }).returning();

    return mapDocument;
  }

  private exploreTiles(centerX: number, centerY: number, radius: number): { x: number; y: number; terrain: string; resources: string[] }[] {
    const tiles = [];
    const terrainTypes = ['grassland', 'forest', 'hills', 'mountains', 'desert', 'swamp', 'coast'];
    const resourceTypes = ['iron', 'gold', 'stone', 'wood', 'mana', 'crystals'];

    for (let x = centerX - radius; x <= centerX + radius; x++) {
      for (let y = centerY - radius; y <= centerY + radius; y++) {
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        if (distance <= radius) {
          tiles.push({
            x,
            y,
            terrain: terrainTypes[Math.floor(Math.random() * terrainTypes.length)],
            resources: Math.random() > 0.7 ? [resourceTypes[Math.floor(Math.random() * resourceTypes.length)]] : []
          });
        }
      }
    }

    return tiles;
  }

  private discoverSecrets(region: MapRegion, quality: 'rough' | 'detailed' | 'masterwork'): string[] {
    const secrets: string[] = [];
    const possibleSecrets = [
      'ancient_ruins',
      'hidden_treasure',
      'secret_passage',
      'magical_spring',
      'lost_temple',
      'dragon_lair',
      'underground_river',
      'sacred_grove'
    ];

    const secretChance = quality === 'rough' ? 0.1 : quality === 'detailed' ? 0.3 : 0.6;
    const maxSecrets = quality === 'rough' ? 1 : quality === 'detailed' ? 2 : 4;

    for (let i = 0; i < maxSecrets; i++) {
      if (Math.random() < secretChance) {
        const secret = possibleSecrets[Math.floor(Math.random() * possibleSecrets.length)];
        if (!secrets.includes(secret)) {
          secrets.push(secret);
        }
      }
    }

    return secrets;
  }

  private identifyUniqueFeatures(region: MapRegion, quality: 'rough' | 'detailed' | 'masterwork'): string[] {
    const features: string[] = [];
    const possibleFeatures = [
      'natural_harbor',
      'mountain_pass',
      'fertile_valley',
      'strategic_viewpoint',
      'ancient_road',
      'river_crossing',
      'mineral_vein',
      'magical_anomaly'
    ];

    const featureChance = quality === 'rough' ? 0.2 : quality === 'detailed' ? 0.4 : 0.7;
    const maxFeatures = quality === 'rough' ? 2 : quality === 'detailed' ? 3 : 5;

    for (let i = 0; i < maxFeatures; i++) {
      if (Math.random() < featureChance) {
        const feature = possibleFeatures[Math.floor(Math.random() * possibleFeatures.length)];
        if (!features.includes(feature)) {
          features.push(feature);
        }
      }
    }

    return features;
  }

  private calculateTradingValue(region: MapRegion, quality: 'rough' | 'detailed' | 'masterwork', accuracy: number, secretsCount: number): number {
    let baseValue = region.radius * 10;
    
    const qualityMultiplier = quality === 'rough' ? 1 : quality === 'detailed' ? 2 : 4;
    const accuracyBonus = accuracy * 0.5;
    const secretsBonus = secretsCount * 15;
    
    return Math.floor(baseValue * qualityMultiplier + accuracyBonus + secretsBonus);
  }

  private async findRegionAt(x: number, y: number, radius: number): Promise<MapRegion | null> {
    const boundingBox = createBoundingBoxCondition(
      mapRegions.centerX,
      mapRegions.centerY,
      x,
      y,
      radius
    );
    
    const distanceCondition = createDistanceCondition(
      mapRegions.centerX,
      mapRegions.centerY,
      x,
      y,
      radius
    );
    
    const [region] = await db.select().from(mapRegions)
      .where(and(
        ...boundingBox,
        distanceCondition,
        sql`ABS(${mapRegions.radius} - ${radius}) <= 2`
      ))
      .limit(1);
    
    return region || null;
  }

  async findNearbyRegions(x: number, y: number, searchRadius: number, limit: number = 10): Promise<MapRegion[]> {
    const boundingBox = createBoundingBoxCondition(
      mapRegions.centerX,
      mapRegions.centerY,
      x,
      y,
      searchRadius
    );
    
    const distanceCondition = createDistanceCondition(
      mapRegions.centerX,
      mapRegions.centerY,
      x,
      y,
      searchRadius
    );
    
    const orderByDistance = orderByDistanceSQL(
      mapRegions.centerX,
      mapRegions.centerY,
      x,
      y
    );
    
    return await db.select().from(mapRegions)
      .where(and(...boundingBox, distanceCondition))
      .orderBy(asc(orderByDistance))
      .limit(limit);
  }

  async findRegionsInArea(
    minX: number,
    maxX: number,
    minY: number,
    maxY: number
  ): Promise<MapRegion[]> {
    return await db.select().from(mapRegions)
      .where(and(
        gte(mapRegions.centerX, minX),
        lte(mapRegions.centerX, maxX),
        gte(mapRegions.centerY, minY),
        lte(mapRegions.centerY, maxY)
      ));
  }

  async getDiscoveredRegions(playerId: string): Promise<MapRegion[]> {
    return await db.select().from(mapRegions)
      .where(eq(mapRegions.exploredBy, playerId));
  }

  async getPlayerMaps(playerId: string): Promise<MapDocument[]> {
    return await db.select().from(mapDocuments)
      .where(eq(mapDocuments.cartographer, playerId));
  }

  async getActiveProjects(playerId: string): Promise<CartographyProject[]> {
    return await db.select().from(cartographyProjects)
      .where(and(
        eq(cartographyProjects.playerId, playerId),
        lt(cartographyProjects.progress, 100)
      ));
  }

  async getTradableMaps(): Promise<MapDocument[]> {
    return await db.select().from(mapDocuments)
      .where(gt(mapDocuments.tradingValue, 0));
  }

  async getMapById(mapId: string): Promise<MapDocument | null> {
    const [map] = await db.select().from(mapDocuments)
      .where(eq(mapDocuments.id, mapId));
    return map || null;
  }

  async transferMap(mapId: string, fromPlayerId: string, toPlayerId: string): Promise<boolean> {
    const map = await this.getMapById(mapId);
    if (!map || map.cartographer !== fromPlayerId) return false;

    const id = `map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const [transferredMap] = await db.insert(mapDocuments).values({
      id,
      name: map.name,
      regionId: map.regionId,
      cartographer: toPlayerId,
      quality: map.quality,
      accuracy: map.accuracy,
      hiddenSecrets: map.hiddenSecrets,
      tradingValue: map.tradingValue,
      uniqueFeatures: map.uniqueFeatures,
      createdAt: new Date(),
      lastUpdated: new Date(),
      isUnique: false
    }).returning();

    this.notifySubscribers(fromPlayerId, {
      type: 'map_transferred',
      map: transferredMap,
      toPlayer: toPlayerId
    });

    this.notifySubscribers(toPlayerId, {
      type: 'map_received',
      map: transferredMap,
      fromPlayer: fromPlayerId
    });

    return true;
  }

  subscribe(playerId: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(playerId)) {
      this.subscribers.set(playerId, []);
    }

    this.subscribers.get(playerId)!.push(callback);

    (async () => {
      const regions = await this.getDiscoveredRegions(playerId);
      const maps = await this.getPlayerMaps(playerId);
      const projects = await this.getActiveProjects(playerId);
      
      callback({
        type: 'initial_state',
        regions,
        maps,
        projects
      });
    })();

    return () => {
      const callbacks = this.subscribers.get(playerId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  private notifySubscribers(playerId: string, data: any): void {
    const callbacks = this.subscribers.get(playerId);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  async getCartographyStats(playerId: string): Promise<{
    regionsDiscovered: number;
    mapsCreated: number;
    activeProjects: number;
    totalTradingValue: number;
    uniqueMaps: number;
  }> {
    const regions = await this.getDiscoveredRegions(playerId);
    const maps = await this.getPlayerMaps(playerId);
    const projects = await this.getActiveProjects(playerId);

    return {
      regionsDiscovered: regions.length,
      mapsCreated: maps.length,
      activeProjects: projects.length,
      totalTradingValue: maps.reduce((sum, map) => sum + map.tradingValue, 0),
      uniqueMaps: maps.filter(map => map.isUnique).length
    };
  }
}

export const cartographyService = new CartographyService();
