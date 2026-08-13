// ─── shared/landUnitCatalog.ts ─────────────────────────────────────────────────
// SYSTÈMES V1-A — Catalogue canonique passif des unités terrestres prototype.
//
// Ce fichier NE BRANCHE RIEN. Il ne remplace pas server/unitCatalog.ts (qui est
// le catalogue serveur-only des stats combat Phase 10.1). Ce fichier est un
// catalogue de DESIGN PROTOTYPE partagé, décrivant les unités terrestres telles
// que définies dans les specs V1-A.
//
// - Les effets de capacité ne sont pas encore automatiquement exécutés.
// - Les coûts sont des valeurs de design à brancher dans un bloc futur.
// - Les clés de ressources dans creationCost / upkeepPerTurn utilisent les
//   identifiants canoniques V3 (shared/economicResources.ts), pas les clés
//   runtime V2. Aucun débit automatique ne se produit à partir de ce fichier.
//
// Aucun système runtime ne lit ce fichier pour l'instant.
// ─────────────────────────────────────────────────────────────────────────────

import type { CanonicalResourceId } from "./economicResources";

// ─── Types de base ───────────────────────────────────────────────────────────

export type LandUnitType = "light" | "medium" | "heavy";

export type LandUnitId =
  | "militia"
  | "garrison"
  | "patrollers"
  | "scouts"
  | "light_infantry"
  | "regular_infantry"
  | "noble_infantry"
  | "shock_troops"
  | "bow_infantry"
  | "crossbow_infantry"
  | "sappers"
  | "field_engineers"
  | "raid_troops"
  | "hunters"
  | "pikemen";

// ─── LandUnitDefinition ──────────────────────────────────────────────────────

export interface LandUnitDefinition {
  id: LandUnitId;
  label: string;
  type: LandUnitType;
  /** Rôle tactique principal. */
  function: string;
  /** Nombre maximal de soldats dans cette unité. */
  size: number;
  /** Cases déplaçables par tour (valeur nominale, sans capacité spéciale). */
  maxMovementPerTurn: number;
  /** Points d'action consommés par case traversée. */
  actionPointCostPerTile: number;
  /** Catégorie de création (qui peut recruter cette unité). */
  creationCategory: "city" | "camp" | "any";
  /**
   * Coût de création en ressources canoniques V3.
   * Clés = CanonicalResourceId, valeurs = quantité.
   * Valeurs de design prototype — pas encore branchées au runtime.
   */
  creationCost: Partial<Record<CanonicalResourceId, number>>;
  /** Points d'usure infligés lors d'un combat (siège ou bataille). */
  siegeWearPoints: number;
  /**
   * Entretien par tour en ressources canoniques V3.
   * Clés = CanonicalResourceId, valeurs = quantité.
   */
  upkeepPerTurn: Partial<Record<CanonicalResourceId, number>>;
  /** Action spéciale débloquée par cette unité (label FR). */
  unlockedAction?: string;
  /** Description de la capacité spéciale. */
  ability?: string;
  /** Notes de design et limitations connues. */
  limitationNotes?: string;
  /** Statut prototype : cette unité n'est pas encore intégrée au runtime. */
  prototypeStatus: true;
}

// ─── LAND_UNIT_CATALOG ───────────────────────────────────────────────────────

export const LAND_UNIT_CATALOG: Record<LandUnitId, LandUnitDefinition> = {

  militia: {
    id: "militia",
    label: "Milice",
    type: "light",
    function: "Infanterie de base",
    size: 10,
    maxMovementPerTurn: 5,
    actionPointCostPerTile: 1,
    creationCategory: "city",
    creationCost: {
      food:            2,
      labor_contracts: 1,
    },
    siegeWearPoints: 1,
    upkeepPerTurn: {
      food: 1,
    },
    unlockedAction: undefined,
    ability: "Aucune compétence spéciale — base de l'armée.",
    limitationNotes: "Simple, peu coûteuse, sans bonus.",
    prototypeStatus: true,
  },

  garrison: {
    id: "garrison",
    label: "Garnison",
    type: "light",
    function: "Défense de position fixe",
    size: 10,
    maxMovementPerTurn: 3,
    actionPointCostPerTile: 2,
    creationCategory: "city",
    creationCost: {
      food:            2,
      labor_contracts: 1,
      wood:            1,
    },
    siegeWearPoints: 2,
    upkeepPerTurn: {
      food: 1,
    },
    unlockedAction: "Tenir position",
    ability:
      "Bonus défensif dans fort, village, avant-poste, camp ou tuile contrôlée.",
    limitationNotes: "Sert surtout à défendre — mobilité faible.",
    prototypeStatus: true,
  },

  patrollers: {
    id: "patrollers",
    label: "Patrouilleurs",
    type: "light",
    function: "Unité rapide / sécurité",
    size: 10,
    maxMovementPerTurn: 16,
    actionPointCostPerTile: 1,
    creationCategory: "city",
    creationCost: {
      food:            3,
      labor_contracts: 1,
      basic_equipment: 1,
    },
    siegeWearPoints: 1,
    upkeepPerTurn: {
      food: 1,
    },
    unlockedAction: "Intercepter",
    ability:
      "Champ de vision +2 pour l'armée attachée ; peut intercepter une petite force proche.",
    limitationNotes: "Moins fort en bataille rangée.",
    prototypeStatus: true,
  },

  scouts: {
    id: "scouts",
    label: "Éclaireurs",
    type: "light",
    function: "Reconnaissance",
    size: 10,
    maxMovementPerTurn: 20,
    actionPointCostPerTile: 1,
    creationCategory: "city",
    creationCost: {
      food:            3,
      labor_contracts: 1,
      basic_equipment: 1,
    },
    siegeWearPoints: 1,
    upkeepPerTurn: {
      food: 1,
    },
    unlockedAction: "Révéler zone",
    ability:
      "Révèle une zone adjacente au champ de vision de l'armée attachée ; réduit le risque d'embuscade.",
    limitationNotes: "Utile hors combat — fragile en bataille directe.",
    prototypeStatus: true,
  },

  light_infantry: {
    id: "light_infantry",
    label: "Infanterie légère",
    type: "light",
    function: "Mobilité / attaque rapide",
    size: 10,
    maxMovementPerTurn: 12,
    actionPointCostPerTile: 1,
    creationCategory: "city",
    creationCost: {
      food:            4,
      labor_contracts: 1,
      basic_equipment: 1,
    },
    siegeWearPoints: 1,
    upkeepPerTurn: {
      food: 2,
    },
    unlockedAction: "Marche forcée",
    ability:
      "Marche forcée : +3 cases de mouvement pendant 3 tours ; entretien en nourriture " +
      "doublé pendant ces 3 tours.",
    limitationNotes: "Coût temporairement élevé pendant la marche forcée.",
    prototypeStatus: true,
  },

  regular_infantry: {
    id: "regular_infantry",
    label: "Infanterie régulière",
    type: "heavy",
    function: "Ligne principale",
    size: 10,
    maxMovementPerTurn: 10,
    actionPointCostPerTile: 2,
    creationCategory: "city",
    creationCost: {
      food:            4,
      labor_contracts: 1,
      basic_equipment: 1,
    },
    siegeWearPoints: 4,
    upkeepPerTurn: {
      food:            2,
      basic_equipment: 1,
    },
    unlockedAction: "Former la ligne",
    ability:
      "Forme la ligne — stabilise l'armée en combat normal et réduit la désorganisation.",
    limitationNotes: "Moins mobile que les unités rapides.",
    prototypeStatus: true,
  },

  noble_infantry: {
    id: "noble_infantry",
    label: "Infanterie noble",
    type: "heavy",
    function: "Défense / choc",
    size: 10,
    maxMovementPerTurn: 10,
    actionPointCostPerTile: 2,
    creationCategory: "city",
    creationCost: {
      food:            5,
      labor_contracts: 1,
      basic_equipment: 2,
    },
    siegeWearPoints: 5,
    upkeepPerTurn: {
      food:            3,
      basic_equipment: 1,
    },
    unlockedAction: "Mur défensif",
    ability:
      "Bloque un passage, protège les unités fragiles, résiste mieux aux attaques.",
    limitationNotes: "Coûteuse — à utiliser pour tenir un objectif.",
    prototypeStatus: true,
  },

  shock_troops: {
    id: "shock_troops",
    label: "Troupe de choc",
    type: "medium",
    function: "Percée / attaque sacrifiable",
    size: 10,
    maxMovementPerTurn: 10,
    actionPointCostPerTile: 2,
    creationCategory: "city",
    creationCost: {
      food:            5,
      labor_contracts: 1,
      basic_equipment: 2,
    },
    siegeWearPoints: 2,
    upkeepPerTurn: {
      food:            3,
      basic_equipment: 1,
    },
    unlockedAction: "Frappe préemptive",
    ability:
      "Frappe préemptive : lors d'une attaque, peut détruire une unité adverse choisie ; " +
      "la troupe de choc est détruite après la bataille.",
    limitationNotes: "Très forte mais consommable — à équilibrer attentivement.",
    prototypeStatus: true,
  },

  bow_infantry: {
    id: "bow_infantry",
    label: "Infanterie à arc",
    type: "light",
    function: "Soutien à distance",
    size: 10,
    maxMovementPerTurn: 10,
    actionPointCostPerTile: 1,
    creationCategory: "city",
    creationCost: {
      food:            4,
      labor_contracts: 1,
      wood:            1,
      common_textiles: 1,
    },
    siegeWearPoints: 1,
    upkeepPerTurn: {
      food: 2,
    },
    unlockedAction: "Assiéger",
    ability:
      "Débloque l'action Assiéger et l'utilisation d'infanterie à projectiles sur le champ de bataille.",
    limitationNotes: "Doit être protégée en combat direct.",
    prototypeStatus: true,
  },

  crossbow_infantry: {
    id: "crossbow_infantry",
    label: "Infanterie à arbalète",
    type: "medium",
    function: "Tir lourd",
    size: 10,
    maxMovementPerTurn: 8,
    actionPointCostPerTile: 2,
    creationCategory: "city",
    creationCost: {
      food:            4,
      labor_contracts: 1,
      wood:            1,
      common_metals:   1,
      basic_equipment: 1,
    },
    siegeWearPoints: 3,
    upkeepPerTurn: {
      food:            2,
      basic_equipment: 1,
    },
    unlockedAction: "Tir lourd",
    ability:
      "+2 usure en siège contre infanterie légère/moyenne ; +1 contre infanterie lourde ennemie.",
    limitationNotes: "Plus lente et plus coûteuse que l'arc.",
    prototypeStatus: true,
  },

  sappers: {
    id: "sappers",
    label: "Sapeurs",
    type: "medium",
    function: "Travaux militaires / sabotage",
    size: 10,
    maxMovementPerTurn: 6,
    actionPointCostPerTile: 2,
    creationCategory: "city",
    creationCost: {
      food:            4,
      labor_contracts: 1,
      wood:            1,
      common_metals:   1,
      basic_equipment: 1,
    },
    siegeWearPoints: 1,
    upkeepPerTurn: {
      food:            2,
      basic_equipment: 1,
    },
    unlockedAction: "Saboter",
    ability:
      "Endommage bâtiment, infrastructure civile, route, porte, pont, campement ou fortification.",
    limitationNotes: "Doit atteindre la cible — vulnérable sans escorte.",
    prototypeStatus: true,
  },

  field_engineers: {
    id: "field_engineers",
    label: "Ingénieurs de campagne",
    type: "medium",
    function: "Construction / siège",
    size: 10,
    maxMovementPerTurn: 6,
    actionPointCostPerTile: 2,
    creationCategory: "city",
    creationCost: {
      food:            4,
      labor_contracts: 1,
      wood:            1,
      common_metals:   1,
      common_textiles: 1,
      basic_equipment: 1,
    },
    siegeWearPoints: 1,
    upkeepPerTurn: {
      food:            2,
      basic_equipment: 1,
    },
    unlockedAction: "Construire ouvrage",
    ability:
      "Camp fortifié, pont temporaire, route, palissade ou opération d'engin de siège.",
    limitationNotes: "Unité de soutien — peu efficace seule.",
    prototypeStatus: true,
  },

  raid_troops: {
    id: "raid_troops",
    label: "Troupe de raid",
    type: "light",
    function: "Perturbation économique",
    size: 10,
    maxMovementPerTurn: 14,
    actionPointCostPerTile: 1,
    creationCategory: "city",
    creationCost: {
      food:            4,
      labor_contracts: 1,
      basic_equipment: 1,
    },
    siegeWearPoints: 1,
    upkeepPerTurn: {
      food: 2,
    },
    unlockedAction: "Raid",
    ability:
      "Pille des cases ennemies pour voler la production ; peut attaquer les convois commerciaux.",
    limitationNotes: "Moins efficace contre position fortifiée.",
    prototypeStatus: true,
  },

  hunters: {
    id: "hunters",
    label: "Chasseurs",
    type: "light",
    function: "Support logistique",
    size: 10,
    maxMovementPerTurn: 12,
    actionPointCostPerTile: 1,
    creationCategory: "city",
    creationCost: {
      food:            3,
      labor_contracts: 1,
      wood:            1,
    },
    siegeWearPoints: 1,
    upkeepPerTurn: {
      food: 1,
    },
    unlockedAction: "Survie / Projectiles",
    ability:
      "Réduit l'entretien en nourriture de l'armée attachée de 5 % par unité de chasseurs " +
      "(max 4 unités = -20 %) ; permet l'infanterie à projectiles.",
    limitationNotes: "Limiter à 4 unités de chasseurs par armée pour le bonus maximum.",
    prototypeStatus: true,
  },

  pikemen: {
    id: "pikemen",
    label: "Piquiers",
    type: "medium",
    function: "Anti-percée / contrôle",
    size: 10,
    maxMovementPerTurn: 10,
    actionPointCostPerTile: 2,
    creationCategory: "city",
    creationCost: {
      food:            4,
      labor_contracts: 1,
      wood:            1,
      common_metals:   1,
      basic_equipment: 1,
    },
    siegeWearPoints: 2,
    upkeepPerTurn: {
      food:            2,
      basic_equipment: 1,
    },
    unlockedAction: "Former un hérisson",
    ability:
      "Chaque unité de piquiers annule l'effet d'une troupe de choc ennemie.",
    limitationNotes: "Contre direct des troupes de choc.",
    prototypeStatus: true,
  },
};

// ─── Accesseurs passifs ──────────────────────────────────────────────────────

/** Retourne la définition d'une unité terrestre par id. */
export function getLandUnit(id: LandUnitId): LandUnitDefinition {
  return LAND_UNIT_CATALOG[id];
}

/** Retourne toutes les unités d'un type donné. */
export function getLandUnitsByType(type: LandUnitType): LandUnitDefinition[] {
  return Object.values(LAND_UNIT_CATALOG).filter(u => u.type === type);
}

/** Retourne tous les ids du catalogue. */
export function getAllLandUnitIds(): LandUnitId[] {
  return Object.keys(LAND_UNIT_CATALOG) as LandUnitId[];
}
