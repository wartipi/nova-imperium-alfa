/**
 * Configuration partagée des icônes et couleurs de ressources
 * Utilisée par le jeu principal et le MapViewer pour garantir la cohérence visuelle
 */

export interface ResourceIconConfig {
  symbol: string;
  color: string;
  name?: string;
}

/**
 * Map complète des ressources avec leurs icônes et couleurs
 * Synchronisée avec le GameEngine.ts principal
 */
export const RESOURCE_ICONS: Record<string, ResourceIconConfig> = {
  // Ressources de base communes
  wheat: { symbol: '🌾', color: '#FFD700', name: 'Blé' },
  cattle: { symbol: '🐄', color: '#8B4513', name: 'Bétail' },
  fish: { symbol: '🐟', color: '#4682B4', name: 'Poisson' },
  deer: { symbol: '🦌', color: '#8B4513', name: 'Cerf' },
  fur: { symbol: '🧥', color: '#654321', name: 'Fourrure' },
  wood: { symbol: '🪵', color: '#8B4513', name: 'Bois' },
  
  // Ressources stratégiques
  stone: { symbol: '🪨', color: '#708090', name: 'Pierre' },
  copper: { symbol: '🔶', color: '#B87333', name: 'Cuivre' },
  iron: { symbol: '⚒️', color: '#C0C0C0', name: 'Fer' },
  coal: { symbol: '⚫', color: '#2F2F2F', name: 'Charbon' },
  gold: { symbol: '🥇', color: '#FFD700', name: 'Or' },
  oil: { symbol: '🛢️', color: '#8B4513', name: 'Pétrole' },
  uranium: { symbol: '☢️', color: '#7CFC00', name: 'Uranium' },
  
  // Ressources spéciales archipel
  herbs: { symbol: '🌿', color: '#32CD32', name: 'Herbes' },
  crystals: { symbol: '💠', color: '#9370DB', name: 'Cristaux' },
  crabs: { symbol: '🦀', color: '#FF6347', name: 'Crabes' },
  whales: { symbol: '🐋', color: '#4169E1', name: 'Baleines' },
  sulfur: { symbol: '🟡', color: '#FFFF00', name: 'Soufre' },
  obsidian: { symbol: '⚫', color: '#1C1C1C', name: 'Obsidienne' },
  
  // Ressources magiques
  sacred_stones: { symbol: '🔮', color: '#8A2BE2', name: 'Pierres sacrées' },
  ancient_artifacts: { symbol: '📿', color: '#DAA520', name: 'Artefacts anciens' },
  mana: { symbol: '🔮', color: '#8A2BE2', name: 'Mana' },
  gems: { symbol: '💎', color: '#00CED1', name: 'Gemmes' },
  silk: { symbol: '🕸️', color: '#DDA0DD', name: 'Soie' },
  
  // Ressources rares supplémentaires
  dragon_scales: { symbol: '🐲', color: '#B22222', name: 'Écailles de dragon' },
  phoenix_feathers: { symbol: '🔥', color: '#FF4500', name: 'Plumes de phénix' },
  moonstone: { symbol: '🌙', color: '#E6E6FA', name: 'Pierre de lune' },
  starlight_essence: { symbol: '✨', color: '#FFD700', name: 'Essence de lumière stellaire' },
  void_crystals: { symbol: '💜', color: '#4B0082', name: 'Cristaux du vide' },
  time_shards: { symbol: '⏳', color: '#40E0D0', name: 'Fragments temporels' },
  ancient_knowledge: { symbol: '📜', color: '#8B4513', name: 'Savoir ancien' },
  elemental_cores: { symbol: '🌟', color: '#FFB6C1', name: 'Noyaux élémentaires' },
  spirit_essence: { symbol: '👻', color: '#F0F8FF', name: 'Essence spirituelle' },
  cosmic_dust: { symbol: '🌌', color: '#483D8B', name: 'Poussière cosmique' },
  ethereal_mist: { symbol: '🌫️', color: '#B0E0E6', name: 'Brume éthérée' },
  divine_light: { symbol: '☀️', color: '#FFD700', name: 'Lumière divine' },
  shadow_essence: { symbol: '🌑', color: '#2F4F4F', name: 'Essence d\'ombre' }
};

/**
 * Fonction utilitaire pour obtenir les informations d'affichage d'une ressource
 */
export function getResourceDisplayInfo(resourceType: string): ResourceIconConfig {
  return RESOURCE_ICONS[resourceType] || { 
    symbol: '❓', 
    color: '#808080', 
    name: resourceType 
  };
}

/**
 * Fonction utilitaire pour obtenir seulement le symbole d'une ressource
 */
export function getResourceIcon(resourceType: string): string {
  return RESOURCE_ICONS[resourceType]?.symbol || '❓';
}

/**
 * Fonction utilitaire pour obtenir seulement la couleur d'une ressource
 */
export function getResourceColor(resourceType: string): string {
  return RESOURCE_ICONS[resourceType]?.color || '#808080';
}