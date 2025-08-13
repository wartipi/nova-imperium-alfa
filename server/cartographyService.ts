// Service de cartographie pour Nova Imperium

interface MapRegion {
  id: string;
  name: string;
  centerX: number;
  centerY: number;
  radius: number;
  tiles: { x: number; y: number; terrain: string; resources: string[] }[];
  exploredBy: string; // ID du joueur qui a exploré
  explorationLevel: number; // 0-100% - niveau de détail de l'exploration
  createdAt: number;
}

interface MapDocument {
  id: string;
  name: string;
  region: MapRegion;
  cartographer: string; // ID du joueur qui a créé la carte
  quality: 'rough' | 'detailed' | 'masterwork'; // Qualité de la carte
  accuracy: number; // 0-100% - précision de la carte
  hiddenSecrets: string[]; // Secrets cachés révélés par la carte
  tradingValue: number; // Valeur commerciale de la carte
  uniqueFeatures: string[]; // Caractéristiques uniques de la région
  createdAt: number;
  lastUpdated: number;
  isUnique: boolean; // Si c'est la seule carte de cette région
}

interface CartographyProject {
  id: string;
  playerId: string;
  regionId: string;
  progress: number; // 0-100%
  requiredActionPoints: number;
  spentActionPoints: number;
  startedAt: number;
  estimatedCompletion: number;
  tools: string[]; // Outils de cartographie utilisés
  assistants: string[]; // Assistants/unités aidant à la cartographie
}

class CartographyService {
  private regions: Map<string, MapRegion> = new Map();
  private mapDocuments: Map<string, MapDocument> = new Map();
  private projects: Map<string, CartographyProject> = new Map();
  private subscribers: Map<string, Array<(data: any) => void>> = new Map();

  // Découvrir une nouvelle région à cartographier
  discoverRegion(
    playerId: string,
    centerX: number,
    centerY: number,
    radius: number,
    name: string
  ): MapRegion | null {
    // Vérifier si la région est déjà découverte
    const existingRegion = this.findRegionAt(centerX, centerY, radius);
    if (existingRegion) {
      return existingRegion;
    }

    // Simuler la découverte des tuiles dans la région
    const tiles = this.exploreTiles(centerX, centerY, radius);
    
    const region: MapRegion = {
      id: `region_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      centerX,
      centerY,
      radius,
      tiles,
      exploredBy: playerId,
      explorationLevel: 25, // Exploration initiale basique
      createdAt: Date.now()
    };

    this.regions.set(region.id, region);
    
    this.notifySubscribers(playerId, {
      type: 'region_discovered',
      region: region
    });

    return region;
  }

  // Commencer un projet de cartographie
  startCartographyProject(
    playerId: string,
    regionId: string,
    tools: string[] = [],
    assistants: string[] = []
  ): CartographyProject | null {
    const region = this.regions.get(regionId);
    if (!region) return null;

    // Calculer les PA requis selon la taille et la complexité
    const baseActionPoints = region.radius * 10;
    const toolsBonus = tools.length * 2;
    const assistantsBonus = assistants.length * 5;
    const requiredActionPoints = Math.max(baseActionPoints - toolsBonus - assistantsBonus, 20);

    const project: CartographyProject = {
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      regionId,
      progress: 0,
      requiredActionPoints,
      spentActionPoints: 0,
      startedAt: Date.now(),
      estimatedCompletion: Date.now() + (requiredActionPoints * 60 * 1000), // 1 minute par PA
      tools,
      assistants
    };

    this.projects.set(project.id, project);
    
    this.notifySubscribers(playerId, {
      type: 'project_started',
      project: project
    });

    return project;
  }

  // Progresser dans un projet de cartographie
  progressProject(projectId: string, actionPointsSpent: number): boolean {
    const project = this.projects.get(projectId);
    if (!project) return false;

    project.spentActionPoints += actionPointsSpent;
    project.progress = Math.min((project.spentActionPoints / project.requiredActionPoints) * 100, 100);

    if (project.progress >= 100) {
      // Projet terminé, créer la carte
      const mapDocument = this.createMapDocument(project);
      if (mapDocument) {
        this.notifySubscribers(project.playerId, {
          type: 'map_completed',
          map: mapDocument,
          project: project
        });
      }
    } else {
      this.notifySubscribers(project.playerId, {
        type: 'project_progress',
        project: project
      });
    }

    return true;
  }

  // Créer un document de carte à partir d'un projet terminé
  private createMapDocument(project: CartographyProject): MapDocument | null {
    const region = this.regions.get(project.regionId);
    if (!region) return null;

    // Déterminer la qualité selon les outils et assistants
    let quality: 'rough' | 'detailed' | 'masterwork' = 'rough';
    let accuracy = 60;

    if (project.tools.includes('precision_compass') && project.tools.includes('surveyor_tools')) {
      quality = 'detailed';
      accuracy = 80;
    }

    if (project.assistants.length >= 2 && project.tools.includes('masterwork_instruments')) {
      quality = 'masterwork';
      accuracy = 95;
    }

    // Découvrir des secrets cachés selon la qualité
    const hiddenSecrets = this.discoverSecrets(region, quality);
    
    // Déterminer les caractéristiques uniques
    const uniqueFeatures = this.identifyUniqueFeatures(region, quality);

    // Calculer la valeur commerciale
    const tradingValue = this.calculateTradingValue(region, quality, accuracy, hiddenSecrets.length);

    // Vérifier si c'est une carte unique
    const isUnique = !Array.from(this.mapDocuments.values()).some(map => 
      map.region.id === region.id && map.quality === quality
    );

    const mapDocument: MapDocument = {
      id: `map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `Carte de ${region.name}`,
      region: region,
      cartographer: project.playerId,
      quality,
      accuracy,
      hiddenSecrets,
      tradingValue,
      uniqueFeatures,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      isUnique
    };

    this.mapDocuments.set(mapDocument.id, mapDocument);
    return mapDocument;
  }

  // Simuler l'exploration de tuiles dans une région
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

  // Découvrir des secrets cachés selon la qualité de la carte
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

  // Identifier les caractéristiques uniques d'une région
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

  // Calculer la valeur commerciale d'une carte
  private calculateTradingValue(region: MapRegion, quality: 'rough' | 'detailed' | 'masterwork', accuracy: number, secretsCount: number): number {
    let baseValue = region.radius * 10;
    
    const qualityMultiplier = quality === 'rough' ? 1 : quality === 'detailed' ? 2 : 4;
    const accuracyBonus = accuracy * 0.5;
    const secretsBonus = secretsCount * 15;
    
    return Math.floor(baseValue * qualityMultiplier + accuracyBonus + secretsBonus);
  }

  // Trouver une région à des coordonnées données
  private findRegionAt(x: number, y: number, radius: number): MapRegion | null {
    for (const region of Array.from(this.regions.values())) {
      const distance = Math.sqrt((region.centerX - x) ** 2 + (region.centerY - y) ** 2);
      if (distance <= radius && Math.abs(region.radius - radius) <= 2) {
        return region;
      }
    }
    return null;
  }

  // Obtenir toutes les régions découvertes par un joueur
  getDiscoveredRegions(playerId: string): MapRegion[] {
    return Array.from(this.regions.values()).filter(region => 
      region.exploredBy === playerId
    );
  }

  // Obtenir toutes les cartes créées par un joueur
  getPlayerMaps(playerId: string): MapDocument[] {
    return Array.from(this.mapDocuments.values()).filter(map => 
      map.cartographer === playerId
    );
  }

  // Obtenir tous les projets actifs d'un joueur
  getActiveProjects(playerId: string): CartographyProject[] {
    return Array.from(this.projects.values()).filter(project => 
      project.playerId === playerId && project.progress < 100
    );
  }

  // Obtenir toutes les cartes disponibles pour l'échange
  getTradableMaps(): MapDocument[] {
    return Array.from(this.mapDocuments.values()).filter(map => map.tradingValue > 0);
  }

  // Obtenir une carte par ID
  getMapById(mapId: string): MapDocument | null {
    return this.mapDocuments.get(mapId) || null;
  }

  // Transférer une carte à un autre joueur (pour l'échange)
  transferMap(mapId: string, fromPlayerId: string, toPlayerId: string): boolean {
    const map = this.mapDocuments.get(mapId);
    if (!map || map.cartographer !== fromPlayerId) return false;

    // Créer une copie de la carte pour le nouveau propriétaire
    const transferredMap: MapDocument = {
      ...map,
      id: `map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      cartographer: toPlayerId,
      lastUpdated: Date.now(),
      isUnique: false // Plus unique après transfert
    };

    this.mapDocuments.set(transferredMap.id, transferredMap);

    // Notifier les deux joueurs
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

  // S'abonner aux mises à jour
  subscribe(playerId: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(playerId)) {
      this.subscribers.set(playerId, []);
    }

    this.subscribers.get(playerId)!.push(callback);

    // Envoyer l'état initial
    callback({
      type: 'initial_state',
      regions: this.getDiscoveredRegions(playerId),
      maps: this.getPlayerMaps(playerId),
      projects: this.getActiveProjects(playerId)
    });

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

  // Notifier les abonnés
  private notifySubscribers(playerId: string, data: any): void {
    const callbacks = this.subscribers.get(playerId);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  // Obtenir les statistiques de cartographie
  getCartographyStats(playerId: string): {
    regionsDiscovered: number;
    mapsCreated: number;
    activeProjects: number;
    totalTradingValue: number;
    uniqueMaps: number;
  } {
    const regions = this.getDiscoveredRegions(playerId);
    const maps = this.getPlayerMaps(playerId);
    const projects = this.getActiveProjects(playerId);

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