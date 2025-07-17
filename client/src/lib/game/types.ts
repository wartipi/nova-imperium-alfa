export type TerrainType = 
  | 'grassland' 
  | 'plains' 
  | 'desert' 
  | 'tundra' 
  | 'snow' 
  | 'ocean' 
  | 'coast' 
  | 'hills' 
  | 'mountains' 
  | 'forest' 
  | 'jungle';

export type UnitType = 
  | 'warrior' 
  | 'archer' 
  | 'settler' 
  | 'scout' 
  | 'spearman' 
  | 'swordsman' 
  | 'catapult';

export type BuildingType = 
  | 'palace' 
  | 'granary' 
  | 'library' 
  | 'barracks' 
  | 'market' 
  | 'temple' 
  | 'courthouse' 
  | 'university';

export type ImprovementType = 
  | 'farm' 
  | 'mine' 
  | 'cottage' 
  | 'camp' 
  | 'plantation' 
  | 'quarry';

export interface HexTile {
  x: number;
  y: number;
  terrain: TerrainType;
  food: number;
  production: number;
  science: number;
  resource: string | null;
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
  civilizationId: string;
  status: 'war' | 'peace' | 'alliance';
  trust: number;
  tradeAgreement: boolean;
  militaryAccess: boolean;
}

export interface Civilization {
  id: string;
  name: string;
  color: string;
  isPlayer: boolean;
  isDefeated: boolean;
  cities: City[];
  units: Unit[];
  resources: {
    food: number;
    production: number;
    science: number;
    culture: number;
    gold: number;
  };
  researchedTechnologies: string[];
  currentResearch: Technology | null;
  researchProgress: number;
  diplomacy: DiplomaticRelation[];
}

export interface GameSave {
  version: string;
  timestamp: number;
  turn: number;
  civilizations: Civilization[];
  mapData: HexTile[][];
}
