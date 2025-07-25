export type TerrainType = 
  | 'wasteland'        // 1 - Terre en friche
  | 'forest'           // 2 - Forêt
  | 'mountains'        // 3 - Montagne
  | 'fertile_land'     // 4 - Terre fertile
  | 'hills'            // 5 - Colline
  | 'shallow_water'    // 6 - Eau peu profonde (littoral)
  | 'deep_water'       // 7 - Eau profonde
  | 'swamp'            // 8 - Marais
  | 'desert'           // 9 - Désert
  | 'sacred_plains'    // 10 - Plaine sacrée
  | 'caves'            // 11 - Grotte / Souterrain
  | 'ancient_ruins'    // 12 - Ruines anciennes
  | 'volcano'          // 13 - Volcan
  | 'enchanted_meadow' // 14 - Prairie enchantée

export type UnitType = 
  | 'warrior' 
  | 'archer' 
  | 'settler' 
  | 'scout' 
  | 'spearman' 
  | 'swordsman' 
  | 'catapult';

export type BuildingType = 
  // Transport/Commercial (Blue)
  | 'port' 
  | 'market' 
  | 'road' 
  | 'shipyard'
  // Agriculture/Nature (Green)
  | 'farm' 
  | 'sawmill' 
  | 'garden'
  // Defense/Military (Red)
  | 'fortress' 
  | 'watchtower' 
  | 'fortifications'
  // Culture/Knowledge (Yellow)
  | 'library' 
  | 'temple' 
  | 'sanctuary' 
  | 'obelisk'
  // Magic/Special (Purple)
  | 'mystic_portal' 
  | 'legendary_forge' 
  | 'laboratory'
  // Ancient/Ruins (Black)
  | 'ancient_hall' 
  | 'underground_base' 
  | 'cave_dwelling';

export type ImprovementType = 
  | 'farm' 
  | 'mine' 
  | 'cottage' 
  | 'camp' 
  | 'plantation' 
  | 'quarry';

export type ResourceType = 
  // Basic Resources (révélées niveau 1+)
  | 'wheat' | 'cattle' | 'fish' | 'stone' | 'copper' | 'iron' | 'gold' | 'wood'
  // Strategic Resources (révélées niveau 1+)
  | 'oil' | 'coal' | 'uranium' | 'silk' | 'spices' | 'gems' | 'ivory'
  // Magical Resources (révélées niveau 3+)
  | 'herbs' | 'crystals' | 'sacred_stones' | 'ancient_artifacts' | 'mana_stones' | 'enchanted_wood'
  // Advanced Magical Resources (révélées niveau 3+)
  | 'mana_crystals' | 'dragon_scales' | 'phoenix_feathers' | 'arcane_stones' 
  | 'elemental_essence' | 'spirit_stones' | 'void_shards';

export interface Resources {
  food: number;
  action_points: number;
  gold: number;
  // Strategic resources
  iron: number;
  stone: number;
  wood: number;
  precious_metals: number;
  // Magical resources for Nova Imperium
  mana: number;
  crystals: number;
  ancient_knowledge: number;
}

export interface HexTile {
  x: number;
  y: number;
  terrain: TerrainType;
  food: number;
  action_points: number;
  gold: number;
  resource: ResourceType | null;
  hasRiver: boolean;
  hasRoad: boolean;
  improvement: ImprovementType | null;
  isVisible: boolean;
  isExplored: boolean;
}

export interface Unit {
  id: string;
  name: string;
  type: UnitType;
  x: number;
  y: number;
  strength: number;
  attack: number;
  defense: number;
  health: number;
  maxHealth: number;
  movement: number;
  maxMovement: number;
  experience: number;
  abilities: string[];
}

export interface City {
  id: string;
  name: string;
  x: number;
  y: number;
  population: number;
  populationCap: number;
  foodPerTurn: number;
  productionPerTurn: number;
  sciencePerTurn: number;
  culturePerTurn: number;
  buildings: BuildingType[];
  currentProduction: {
    type: 'building' | 'unit';
    name: string;
    cost: number;
  } | null;
  productionProgress: number;
  workingHexes: { x: number; y: number }[];
}

export interface Technology {
  id: string;
  name: string;
  cost: number;
  description: string;
  prerequisites: string[];
}

export interface DiplomaticRelation {
  novaImperiumId: string;
  status: 'war' | 'peace' | 'alliance';
  trust: number;
  tradeAgreement: boolean;
  militaryAccess: boolean;
}

export interface NovaImperium {
  id: string;
  name: string;
  color: string;
  isPlayer: boolean;
  isDefeated: boolean;
  cities: City[];
  units: Unit[];
  resources: Resources;
  researchedTechnologies: string[];
  currentResearch: Technology | null;
  researchProgress: number;
  diplomacy: DiplomaticRelation[];
}

export interface GameSave {
  version: string;
  timestamp: number;
  turn: number;
  novaImperiums: NovaImperium[];
  mapData: HexTile[][];
}
