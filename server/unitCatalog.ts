// ─── Catalogue canonique des unités — Phase 10.1 ─────────────────────────────
// Source de vérité unique des stats par type d'unité côté serveur.
// strength est inclus ici — il n'est PAS persisté en DB mais injecté dans le DTO API.
// Usage serveur uniquement : ne jamais exporter ce catalogue vers le client.

export interface UnitStats {
  name:      string;
  strength:  number;
  health:    number;
  attack:    number;
  defense:   number;
  movement:  number;
}

export const UNIT_CATALOG: Record<string, UnitStats> = {
  warrior:     { name: 'Guerrier',     strength: 4,  health: 10, attack: 2, defense: 1, movement: 2 },
  spearman:    { name: 'Lancier',      strength: 5,  health: 12, attack: 2, defense: 2, movement: 2 },
  swordsman:   { name: 'Épéiste',      strength: 7,  health: 14, attack: 3, defense: 2, movement: 2 },
  archer:      { name: 'Archer',       strength: 3,  health: 8,  attack: 3, defense: 1, movement: 2 },
  crossbowman: { name: 'Arbalétrier',  strength: 5,  health: 10, attack: 4, defense: 1, movement: 2 },
  catapult:    { name: 'Catapulte',    strength: 8,  health: 8,  attack: 5, defense: 0, movement: 1 },
  trebuchet:   { name: 'Trébuchet',    strength: 10, health: 8,  attack: 6, defense: 0, movement: 1 },
  horseman:    { name: 'Cavalier',     strength: 6,  health: 12, attack: 3, defense: 1, movement: 3 },
  knight:      { name: 'Chevalier',    strength: 9,  health: 15, attack: 4, defense: 3, movement: 3 },
  galley:      { name: 'Galère',       strength: 4,  health: 10, attack: 2, defense: 1, movement: 3 },
  warship:     { name: 'Navire',       strength: 7,  health: 14, attack: 4, defense: 2, movement: 2 },
  scout:       { name: 'Éclaireur',    strength: 2,  health: 6,  attack: 1, defense: 1, movement: 3 },
  settler:     { name: 'Colon',        strength: 0,  health: 5,  attack: 0, defense: 0, movement: 2 },
  diplomat:    { name: 'Diplomate',    strength: 0,  health: 5,  attack: 0, defense: 0, movement: 2 },
  spy:         { name: 'Espion',       strength: 1,  health: 5,  attack: 1, defense: 0, movement: 3 },
};
