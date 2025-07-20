/**
 * Types et interfaces optimisés pour Nova Imperium
 * Définitions précises pour éviter les erreurs de typage
 */

// === RESSOURCES ===
export interface Ressource {
  type: 'or' | 'bois' | 'nourriture' | 'mana' | 'cristaux' | 'pierre' | 'fer' | 'connaissances_anciennes';
  quantité: number;
  maxQuantité?: number;
}

export interface RessourcesCollection {
  [key: string]: Ressource;
}

// === TERRAINS ET TUILES ===
export type TypeTerrain = 
  | 'wasteland'        // Terre en friche
  | 'forest'           // Forêt
  | 'mountains'        // Montagne
  | 'fertile_land'     // Terre fertile
  | 'hills'            // Colline
  | 'shallow_water'    // Eau peu profonde
  | 'deep_water'       // Eau profonde
  | 'swamp'            // Marais
  | 'desert'           // Désert
  | 'sacred_plains'    // Plaine sacrée
  | 'caves'            // Grotte
  | 'ancient_ruins'    // Ruines anciennes
  | 'volcano'          // Volcan
  | 'enchanted_meadow'; // Prairie enchantée

export interface Tuile {
  x: number;
  y: number;
  type: TypeTerrain;
  bâtiment?: Bâtiment;
  unité?: Unité;
  ressource?: Ressource;
  exploré: boolean;
  visible: boolean;
  coutDéplacement: number;
}

// === BÂTIMENTS ===
export type TypeBâtiment = 
  | 'port' | 'marché' | 'route' | 'chantier_naval'     // Transport/Commercial
  | 'ferme' | 'scierie' | 'jardin'                     // Agriculture
  | 'forteresse' | 'tour_de_guet' | 'fortifications'   // Défense
  | 'bibliothèque' | 'temple' | 'sanctuaire'           // Culture
  | 'portail_mystique' | 'forge_légendaire';           // Magie

export interface Bâtiment {
  id: string;
  nom: string;
  type: TypeBâtiment;
  x: number;
  y: number;
  coûtConstruction: RessourcesCollection;
  tempsConstruction: number;
  description: string;
  catégorie: 'Basique' | 'Production' | 'Défense' | 'Culture' | 'Magie' | 'Transport';
  terrainsRequis: TypeTerrain[];
  coûtPointsAction: number;
  construit: boolean;
}

// === UNITÉS ===
export type TypeUnité = 
  | 'guerrier' 
  | 'archer' 
  | 'colon' 
  | 'éclaireur' 
  | 'lancier' 
  | 'épéiste' 
  | 'catapulte';

export interface Unité {
  id: string;
  nom: string;
  type: TypeUnité;
  x: number;
  y: number;
  force: number;
  attaque: number;
  défense: number;
  santé: number;
  santéMax: number;
  mouvement: number;
  mouvementMax: number;
  expérience: number;
  compétences: string[];
  propriétaire: string; // ID du joueur
}

// === ÉTAT DU JEU ===
export interface ÉtatJeu {
  ressources: RessourcesCollection;
  carte: Tuile[][];
  tour: number;
  phase: 'chargement' | 'menu' | 'jeu' | 'pause';
  joueurActuel: string;
  pointsAction: {
    actuels: number;
    maximum: number;
    régénérationParTour: number;
  };
}

// === JOUEUR ===
export interface Joueur {
  id: string;
  nom: string;
  ressources: RessourcesCollection;
  unités: Unité[];
  bâtiments: Bâtiment[];
  technologiesRecherchées: string[];
  réputation: {
    honneur: number;
    richesse: number;
    pouvoir: number;
    sagesse: number;
  };
  position: {
    x: number;
    y: number;
  };
}

// === FACTIONS ET DIPLOMATIE ===
export interface Faction {
  id: string;
  nom: string;
  couleur: string;
  chef: Joueur;
  membres: Joueur[];
  relations: {
    [factionId: string]: 'allié' | 'neutre' | 'ennemi' | 'guerre';
  };
  objectifs: string[];
}

// === ACTIONS ET COÛTS ===
export interface CoûtsActions {
  construction: Record<TypeBâtiment, number>;
  recrutementUnité: Record<TypeUnité, number>;
  déplacementUnité: Record<TypeUnité, number>;
  exploration: number;
  diplomatie: number;
  recherche: number;
}

// === SYSTÈME DE VISION ===
export interface SystèmeVision {
  niveauExploration: number;
  portéeVision: number;
  hexagonesVisibles: { x: number; y: number }[];
  hexagonesExplorés: { x: number; y: number }[];
}

// === VALIDATIONS ===
export interface ValidationSystème {
  nom: string;
  statut: boolean;
  détails: string;
  vérifications: Array<{
    nom: string;
    résultat: boolean;
    message?: string;
  }>;
}