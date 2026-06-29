import type { TerrainType } from "./types";

// Coûts de déplacement en Points d'Action pour chaque type de terrain
export const TERRAIN_MOVEMENT_COSTS: Record<TerrainType, number> = {
  // Terrains faciles (1 PA)
  fertile_land: 1,        // Terre fertile - facile à parcourir
  sacred_plains: 1,       // Plaines sacrées - terrain plat
  enchanted_meadow: 1,    // Prairie enchantée - terrain magique mais praticable
  
  // Terrains moyens (2 PA)
  wasteland: 2,           // Terre en friche - terrain difficile
  forest: 2,              // Forêt - végétation dense
  hills: 2,               // Collines - terrain vallonné
  desert: 2,              // Désert - sable difficile
  ancient_ruins: 2,       // Ruines anciennes - débris à contourner
  
  // Terrains difficiles (3 PA)
  swamp: 3,               // Marais - terrain boueux et dangereux
  caves: 3,               // Grottes - terrain accidenté
  
  // Terrains extrêmement difficiles (5 PA)
  volcano: 5,             // Volcan - terrain dangereux et rocheux
  mountains: 5,           // Montagnes - terrain le plus difficile
  
  // Terrains aquatiques (impossible sans navire)
  shallow_water: 999,     // Eau peu profonde - nécessite un bateau
  deep_water: 999,        // Eau profonde - nécessite un navire

  // Terrains standards
  plains: 1,              // Plaine - terrain facile
};

// Fonction pour obtenir le coût de déplacement d'un terrain
export function getTerrainMovementCost(terrain: TerrainType): number {
  return TERRAIN_MOVEMENT_COSTS[terrain] || 1;
}

// Fonction pour obtenir la description du coût
export function getTerrainCostDescription(terrain: TerrainType): string {
  const cost = getTerrainMovementCost(terrain);
  
  if (cost === 999) {
    return "Impossible (nécessite un navire)";
  }
  
  if (cost === 1) {
    return "Facile (1 PA)";
  } else if (cost === 2) {
    return "Modéré (2 PA)";
  } else if (cost === 3) {
    return "Difficile (3 PA)";
  } else if (cost === 5) {
    return "Extrêmement difficile (5 PA)";
  }
  
  return `${cost} PA`;
}

// Fonction pour obtenir l'emoji de difficulté
export function getTerrainDifficultyEmoji(terrain: TerrainType): string {
  const cost = getTerrainMovementCost(terrain);
  
  if (cost === 999) {
    return "🚫";  // Impossible
  } else if (cost === 1) {
    return "🟢";  // Facile
  } else if (cost === 2) {
    return "🟡";  // Modéré
  } else if (cost === 3) {
    return "🟠";  // Difficile
  } else if (cost === 5) {
    return "⚫";  // Extrêmement difficile
  }
  
  return "⚪";
}