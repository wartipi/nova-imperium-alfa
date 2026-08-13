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
  | 'plains'           // 15 - Plaine standard

export type UnitType =
  | 'warrior' | 'spearman' | 'swordsman'
  | 'archer' | 'crossbowman'
  | 'catapult' | 'trebuchet'
  | 'horseman' | 'knight'
  | 'galley' | 'warship'
  | 'scout' | 'settler' | 'diplomat' | 'spy';

export type BuildingType = 
  // Bâtiments Phase 7/8 — utilisés dans le flux persisté (BUILDING_YIELDS serveur, city_buildings)
  | 'granary'
  | 'barracks'
  | 'palace'
  | 'courthouse'
  | 'university'
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

// ─── LISTE OFFICIELLE DES RESSOURCES NOVA IMPERIUM V2 ────────────────────────

export type ResourceType =
  // A. COMMUNES — ressources naturelles de carte (révélées niveau 1+)
  | 'food'           // Nourriture
  | 'wood'           // Bois
  | 'leather_fur'    // Cuir et fourrure  (remplace cattle + fur)
  | 'stone'          // Pierre
  | 'common_metals'  // Métaux communs    (remplace iron + copper)
  | 'coal'           // Charbon
  | 'oil'            // Huile             (anciennement Pétrole)
  | 'herbs'          // Herbes            (était magique, maintenant commune)

  // B. STRATÉGIQUES — produites par bâtiments, jamais sur la carte
  // V3-D2 : ressources prototype unités (pas encore liées à des bâtiments producteurs)
  | 'common_textiles'        // Textiles communs
  | 'labor_contracts'        // Contrats de travail
  | 'basic_equipment'        // Équipement basique
  | 'intermediate_equipment' // Équipement intermédiaire
  | 'advanced_equipment'     // Équipement avancé
  | 'epic_equipment'         // Équipement épique
  | 'legendary_equipment'    // Équipement légendaire

  // C. RARES — ressources naturelles de carte (révélées niveau 1+)
  | 'rare_metals_alloys' // Métaux et alliages rares (remplace gold comme ressource rare)
  | 'textiles'           // Textiles              (remplace silk)
  | 'spices'             // Épices
  | 'precious_stones'    // Pierres précieuses    (remplace gems)

  // D. MAGIQUES — ressources naturelles de carte (révélées niveau 3+)
  | 'crystals'           // Cristaux
  | 'sacred_stones'      // Pierres sacrées
  | 'ancient_artifacts'  // Artefacts anciens
  | 'enchanted_wood'     // Bois enchanté
  | 'mana_crystals'      // Cristaux de mana
  | 'arcane_stones'      // Pierres arcaniques
  | 'elemental_essence'  // Essence élémentaire
  | 'spirit_stones'      // Pierres d'esprit
  | 'void_shards';       // Éclats du vide

// E. MONNAIE — fracten (jamais sur la carte, remplace gold comme monnaie)
export type CurrencyType = 'fracten';

export interface Resources {
  food: number;
  action_points: number;
  fracten: number;         // Monnaie officielle (remplace gold)
  // Ressources communes
  common_metals: number;   // Métaux communs (remplace iron + copper)
  stone: number;
  wood: number;
  leather_fur: number;     // Cuir et fourrure (remplace fur + cattle)
  // Ressources magiques
  crystals: number;
  ancient_knowledge: number;
}

export interface HexTile {
  x: number;
  y: number;
  terrain: TerrainType;
  food: number;
  action_points: number;
  fracten: number;         // Bloc A V2 : yield visuel de la tuile (remplace gold hérité du générateur)
  resource: ResourceType | null;
  resources: string[];
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
  displayName?: string; // Nom choisi par le joueur (optionnel, utilise name si absent)
  x: number;
  y: number;
  population: number;
  populationCap: number;
  foodPerTurn: number;
  productionPerTurn: number;
  sciencePerTurn: number;
  culturePerTurn: number;
  colonyId?: string;    // colonies.id côté DB (distinct de id depuis Phase 7)
  buildings: BuildingType[];
  currentProduction: {
    type: 'building' | 'unit';
    name: string;
    cost: number;
  } | null;
  productionProgress: number;
  workingHexes: { x: number; y: number }[];  // non persisté — placeholder Phase 7
  playerName?: string; // Propriétaire de la ville
  factionName?: string; // Faction propriétaire
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
