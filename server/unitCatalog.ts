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

  // ── Unités terrestres prototype (V3-D6-B) ────────────────────────────────────
  // Labels et movement depuis shared/landUnitCatalog.ts.
  // Stats combat provisoires (health/attack/defense/strength) — à calibrer en V3-D7.
  // Non recrutables jusqu'à V3-D6-C (absent de RUNTIME_RECRUITMENT_COSTS).
  // GET /recruitment-costs ne les expose pas encore (filtre UNIT_CATALOG ∩ RUNTIME_RECRUITMENT_COSTS).

  // Infanterie légère
  militia:          { name: 'Milice',                  strength: 2,  health: 8,  attack: 1, defense: 1, movement: 5  },
  garrison:         { name: 'Garnison',                strength: 3,  health: 10, attack: 1, defense: 3, movement: 3  },
  patrollers:       { name: 'Patrouilleurs',           strength: 2,  health: 7,  attack: 2, defense: 1, movement: 16 },
  scouts:           { name: 'Éclaireurs',              strength: 1,  health: 6,  attack: 1, defense: 1, movement: 20 },
  light_infantry:   { name: 'Infanterie légère',       strength: 4,  health: 10, attack: 3, defense: 1, movement: 12 },
  // Infanterie lourde
  regular_infantry: { name: 'Infanterie régulière',    strength: 5,  health: 12, attack: 3, defense: 2, movement: 10 },
  noble_infantry:   { name: 'Infanterie noble',        strength: 6,  health: 14, attack: 3, defense: 3, movement: 10 },
  shock_troops:     { name: 'Troupe de choc',          strength: 6,  health: 10, attack: 5, defense: 1, movement: 10 },
  // Distance
  bow_infantry:     { name: 'Infanterie à arc',        strength: 3,  health: 8,  attack: 4, defense: 1, movement: 10 },
  crossbow_infantry:{ name: 'Infanterie à arbalète',   strength: 4,  health: 10, attack: 5, defense: 1, movement: 8  },
  // Technique
  sappers:          { name: 'Sapeurs',                 strength: 2,  health: 8,  attack: 1, defense: 1, movement: 6  },
  field_engineers:  { name: 'Ingénieurs de campagne',  strength: 2,  health: 8,  attack: 1, defense: 1, movement: 6  },
  // Raid / Soutien
  raid_troops:      { name: 'Troupe de raid',          strength: 4,  health: 9,  attack: 4, defense: 1, movement: 14 },
  hunters:          { name: 'Chasseurs',               strength: 3,  health: 8,  attack: 2, defense: 1, movement: 12 },
  // Contrôle
  pikemen:          { name: 'Piquiers',                strength: 4,  health: 11, attack: 2, defense: 4, movement: 10 },
};
