/**
 * Configuration partagée des icônes et couleurs de ressources
 * Utilisée par le jeu principal et le MapViewer pour garantir la cohérence visuelle
 *
 * V2 — Ressources officielles (monnaie + matières)
 * V1 legacy — conservées pour affichage de stocks existants uniquement
 */

export interface ResourceIconConfig {
  symbol: string;
  color: string;
  name?: string;
  legacy?: boolean; // true = ressource V1, non proposée dans les nouveaux contenus
}

/**
 * Map complète des ressources avec leurs icônes et couleurs.
 * V2 officielles en tête de liste — V1 legacy en bas (conservées, non supprimées).
 */
export const RESOURCE_ICONS: Record<string, ResourceIconConfig> = {

  // ─── V2 — Monnaie ────────────────────────────────────────────────────────
  fracten:          { symbol: '🪙', color: '#FFD700', name: 'Fracten' },

  // ─── V2 — Ressources de base ──────────────────────────────────────────────
  food:             { symbol: '🌾', color: '#7CFC00', name: 'Nourriture' },
  wood:             { symbol: '🪵', color: '#8B4513', name: 'Bois' },
  stone:            { symbol: '🪨', color: '#708090', name: 'Pierre' },
  coal:             { symbol: '⚫', color: '#2F2F2F', name: 'Charbon' },
  oil:              { symbol: '🛢️', color: '#8B4513', name: 'Pétrole' },
  herbs:            { symbol: '🌿', color: '#32CD32', name: 'Herbes' },
  common_metals:    { symbol: '⚙️', color: '#A8A8A8', name: 'Métaux communs' },
  leather_fur:      { symbol: '🦊', color: '#8B4513', name: 'Cuir & fourrure' },

  // ─── V2 — Ressources rares ────────────────────────────────────────────────
  rare_metals_alloys: { symbol: '🔩', color: '#DAA520', name: 'Métaux & alliages rares' },
  textiles:           { symbol: '🧵', color: '#DDA0DD', name: 'Textiles' },
  spices:             { symbol: '🌶️', color: '#FF4500', name: 'Épices' },
  precious_stones:    { symbol: '💎', color: '#00CED1', name: 'Pierres précieuses' },
  crystals:           { symbol: '🔮', color: '#9370DB', name: 'Cristaux' },
  sacred_stones:      { symbol: '🗿', color: '#8A2BE2', name: 'Pierres sacrées' },
  ancient_artifacts:  { symbol: '🏺', color: '#DAA520', name: 'Artefacts anciens' },
  enchanted_wood:     { symbol: '🌳', color: '#228B22', name: 'Bois enchanté' },
  mana_crystals:      { symbol: '✨', color: '#9400D3', name: 'Cristaux de mana' },
  arcane_stones:      { symbol: '🌀', color: '#483D8B', name: 'Pierres arcaniques' },
  elemental_essence:  { symbol: '🔥', color: '#FF4500', name: 'Essence élémentaire' },
  spirit_stones:      { symbol: '👻', color: '#F0F8FF', name: 'Pierres spirituelles' },
  void_shards:        { symbol: '🌌', color: '#4B0082', name: 'Éclats du vide' },

  // ─── V2 — Ressources naturelles (carte/exploration) ──────────────────────
  deer:             { symbol: '🦌', color: '#8B4513', name: 'Cerf' },
  crabs:            { symbol: '🦀', color: '#FF6347', name: 'Crabes' },
  whales:           { symbol: '🐋', color: '#4169E1', name: 'Baleines' },
  sulfur:           { symbol: '🟡', color: '#FFFF00', name: 'Soufre' },
  obsidian:         { symbol: '⚫', color: '#1C1C1C', name: 'Obsidienne' },

  // ─── Ressources rares supplémentaires ─────────────────────────────────────
  dragon_scales:       { symbol: '🐲', color: '#B22222', name: 'Écailles de dragon' },
  phoenix_feathers:    { symbol: '🔥', color: '#FF4500', name: 'Plumes de phénix' },
  moonstone:           { symbol: '🌙', color: '#E6E6FA', name: 'Pierre de lune' },
  starlight_essence:   { symbol: '✨', color: '#FFD700', name: 'Essence de lumière stellaire' },
  void_crystals:       { symbol: '💜', color: '#4B0082', name: 'Cristaux du vide' },
  time_shards:         { symbol: '⏳', color: '#40E0D0', name: 'Fragments temporels' },
  ancient_knowledge:   { symbol: '📜', color: '#8B4513', name: 'Savoir ancien' },
  elemental_cores:     { symbol: '🌟', color: '#FFB6C1', name: 'Noyaux élémentaires' },
  spirit_essence:      { symbol: '👻', color: '#F0F8FF', name: 'Essence spirituelle' },
  cosmic_dust:         { symbol: '🌌', color: '#483D8B', name: 'Poussière cosmique' },
  ethereal_mist:       { symbol: '🌫️', color: '#B0E0E6', name: 'Brume éthérée' },
  divine_light:        { symbol: '☀️', color: '#FFD700', name: 'Lumière divine' },
  shadow_essence:      { symbol: '🌑', color: '#2F4F4F', name: "Essence d'ombre" },

  // ─── V1 legacy — Conservées pour stocks existants, non proposées dans nouveaux contenus ──
  wheat:    { symbol: '🌾', color: '#FFD700', name: 'Blé (legacy)',          legacy: true },
  cattle:   { symbol: '🐄', color: '#8B4513', name: 'Bétail (legacy)',       legacy: true },
  fish:     { symbol: '🐟', color: '#4682B4', name: 'Poisson (legacy)',      legacy: true },
  fur:      { symbol: '🧥', color: '#654321', name: 'Fourrure (legacy)',     legacy: true },
  copper:   { symbol: '🔶', color: '#B87333', name: 'Cuivre (legacy)',       legacy: true },
  iron:     { symbol: '⚒️', color: '#C0C0C0', name: 'Fer (legacy)',          legacy: true },
  gold:     { symbol: '🥇', color: '#FFD700', name: 'Or (legacy)',           legacy: true },
  uranium:  { symbol: '☢️', color: '#7CFC00', name: 'Uranium (legacy)',      legacy: true },
  gems:     { symbol: '💠', color: '#00CED1', name: 'Gemmes (legacy)',       legacy: true },
  silk:     { symbol: '🕸️', color: '#DDA0DD', name: 'Soie (legacy)',         legacy: true },
  mana:     { symbol: '🔮', color: '#8A2BE2', name: 'Mana (legacy)',         legacy: true },
  mana_stones: { symbol: '🌀', color: '#8A2BE2', name: 'Pierres de mana (legacy)', legacy: true },
};

/**
 * Fonction utilitaire pour obtenir les informations d'affichage d'une ressource
 */
export function getResourceDisplayInfo(resourceType: string): ResourceIconConfig {
  return RESOURCE_ICONS[resourceType] || {
    symbol: '❓',
    color: '#808080',
    name: resourceType,
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
