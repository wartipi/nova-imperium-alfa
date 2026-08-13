// ─── shared/economicResources.ts ───────────────────────────────────────────────
// SYSTÈMES V1-A — Catalogue canonique passif des ressources économiques.
//
// Ce fichier NE BRANCHE RIEN. Il ne remplace aucune logique runtime existante.
// Il complète shared/tileModifiers.ts (V3-B) en définissant la liste officielle
// V3 des ressources économiques de Nova Imperium, avec leurs catégories et
// le mapping depuis les anciennes clés runtime (V2).
//
// Règle canonique V3 :
//   - oil, coal, peat, bitumen, etc. → TILE MODIFIERS qui produisent `fuel`
//   - herbs → TILE MODIFIER qui produit `common_ingredients`
//   - Ne pas renommer les clés runtime V2 dans ce bloc (voir LEGACY_TO_CANONICAL)
//
// Aucun système runtime ne lit ce fichier pour l'instant.
// ─────────────────────────────────────────────────────────────────────────────

// ─── CanonicalResourceCategory ──────────────────────────────────────────────
export type CanonicalResourceCategory =
  | "common"      // Ressources communes — récoltées dans l'environnement
  | "rare"        // Commodités rares — précieuses, coloniales, exotiques, mystiques
  | "strategic"   // Ressources stratégiques — produites par organisation humaine
  | "currency";   // Monnaie officielle

// ─── CanonicalResourceId ────────────────────────────────────────────────────
// Liste canonique V3 officielle des ressources économiques de Nova Imperium.
//
// COMMUNES
export type CommonResourceId =
  | "food"               // Nourriture
  | "wood"               // Bois
  | "leather_fur"        // Cuir et fourrure
  | "stone"              // Pierre
  | "common_metals"      // Métaux communs
  | "fuel"               // Combustible  ← remplace conceptuellement coal + oil
  | "common_ingredients" // Ingrédients communs  ← remplace conceptuellement herbs
  | "common_textiles";   // Textiles communs  ← nouveau

// COMMODITÉS RARES
export type RareResourceId =
  | "rare_metals_alloys"      // Métaux et alliages rares
  | "fine_textiles"           // Textiles fins
  | "luxury_goods"            // Commodités de luxe
  | "gemstones"               // Pierres précieuses
  | "rare_ingredients"        // Ingrédients rares
  | "noble_furs"              // Fourrures nobles
  | "precious_wood"           // Bois précieux
  | "ancient_relics"          // Reliques anciennes
  | "magical_stones_crystals"; // Pierres et cristaux magiques

// RESSOURCES STRATÉGIQUES
export type StrategicResourceId =
  | "labor_contracts"          // Contrats de travail
  | "basic_equipment"          // Équipement basique
  | "intermediate_equipment"   // Équipement intermédiaire
  | "advanced_equipment"       // Équipement avancé
  | "rare_equipment"           // Équipement rare
  | "legendary_equipment";     // Équipement légendaire

// MONNAIE
export type CurrencyResourceId = "fracten";

// Union complète
export type CanonicalResourceId =
  | CommonResourceId
  | RareResourceId
  | StrategicResourceId
  | CurrencyResourceId;

// ─── CanonicalResourceDefinition ────────────────────────────────────────────
export interface CanonicalResourceDefinition {
  id:       CanonicalResourceId;
  label:    string;               // Label FR officiel
  category: CanonicalResourceCategory;
  /** Clé(s) runtime V2 que cette ressource remplace conceptuellement.
   *  Vide si la ressource est nouvelle et n'a pas d'équivalent V2. */
  legacyKeys: string[];
  /** Notes de design : différences avec l'ancien système, précautions. */
  notes?: string;
}

// ─── CANONICAL_RESOURCES ────────────────────────────────────────────────────
// Catalogue complet des ressources canoniques V3.
export const CANONICAL_RESOURCES: Record<CanonicalResourceId, CanonicalResourceDefinition> = {

  // ── Communes ────────────────────────────────────────────────────────────
  food: {
    id: "food",
    label: "Nourriture",
    category: "common",
    legacyKeys: ["food"],
  },
  wood: {
    id: "wood",
    label: "Bois",
    category: "common",
    legacyKeys: ["wood"],
  },
  leather_fur: {
    id: "leather_fur",
    label: "Cuir et fourrure",
    category: "common",
    legacyKeys: ["leather_fur", "fur"],
  },
  stone: {
    id: "stone",
    label: "Pierre",
    category: "common",
    legacyKeys: ["stone"],
  },
  common_metals: {
    id: "common_metals",
    label: "Métaux communs",
    category: "common",
    legacyKeys: ["common_metals", "iron", "copper"],
  },
  fuel: {
    id: "fuel",
    label: "Combustible",
    category: "common",
    legacyKeys: ["coal", "oil"],
    notes:
      "Remplace conceptuellement coal et oil. Dans le runtime V2, `coal` et `oil` " +
      "sont encore des clés distinctes (colonnes DB séparées). " +
      "coal provient des mines (advanced_mine) et oil des oil_camp. " +
      "Les tile modifiers coal/oil/herbs/peat produiront `fuel` dans une version future.",
  },
  common_ingredients: {
    id: "common_ingredients",
    label: "Ingrédients communs",
    category: "common",
    legacyKeys: ["herbs"],
    notes:
      "Remplace conceptuellement herbs. La clé runtime `herbs` reste active en V2 " +
      "(colonne DB, herbalist_house, marché). Renommage à faire en V3-C4+.",
  },
  common_textiles: {
    id: "common_textiles",
    label: "Textiles communs",
    category: "common",
    legacyKeys: [],
    notes:
      "Nouvelle ressource — aucune colonne DB existante. Utilisée comme coût de " +
      "création pour infanterie à arc et ingénieurs de campagne (catalogue prototype). " +
      "À ajouter en DB lors d'un bloc dédié.",
  },

  // ── Commodités rares ────────────────────────────────────────────────────
  rare_metals_alloys: {
    id: "rare_metals_alloys",
    label: "Métaux et alliages rares",
    category: "rare",
    legacyKeys: ["rare_metals_alloys"],
    notes:
      "Présent en UI (ResourceIcons.ts, UnifiedTerritoryPanel) mais sans colonne DB ni production runtime.",
  },
  fine_textiles: {
    id: "fine_textiles",
    label: "Textiles fins",
    category: "rare",
    legacyKeys: ["textiles"],
    notes:
      "Label UI orphelin `textiles` dans ResourceIcons.ts — à réconcilier avec cette clé canonique.",
  },
  luxury_goods: {
    id: "luxury_goods",
    label: "Commodités de luxe",
    category: "rare",
    legacyKeys: [],
    notes: "Absente de toutes les couches actuelles.",
  },
  gemstones: {
    id: "gemstones",
    label: "Pierres précieuses",
    category: "rare",
    legacyKeys: ["precious_stones"],
    notes:
      "Label UI orphelin `precious_stones` dans ResourceIcons.ts.",
  },
  rare_ingredients: {
    id: "rare_ingredients",
    label: "Ingrédients rares",
    category: "rare",
    legacyKeys: [],
    notes: "Absente de toutes les couches actuelles.",
  },
  noble_furs: {
    id: "noble_furs",
    label: "Fourrures nobles",
    category: "rare",
    legacyKeys: [],
    notes:
      "Absente du runtime. À terme, le tile modifier `fur` pourrait produire " +
      "`noble_furs` selon la rareté (ou rester `leather_fur` selon décision design).",
  },
  precious_wood: {
    id: "precious_wood",
    label: "Bois précieux",
    category: "rare",
    legacyKeys: ["enchanted_wood"],
    notes:
      "Label UI orphelin `enchanted_wood` dans ResourceIcons.ts — nom fantastique, " +
      "à aligner avec `precious_wood` lors d'un bloc dédié.",
  },
  ancient_relics: {
    id: "ancient_relics",
    label: "Reliques anciennes",
    category: "rare",
    legacyKeys: [],
    notes:
      "Absente du runtime. Le tile modifier `ancient_artifacts` devrait produire " +
      "`ancient_relics` quand un bâtiment d'exploitation sera défini.",
  },
  magical_stones_crystals: {
    id: "magical_stones_crystals",
    label: "Pierres et cristaux magiques",
    category: "rare",
    legacyKeys: ["crystals", "arcane_stones", "spirit_stones", "sacred_stones"],
    notes:
      "Plusieurs labels UI orphelins dans ResourceIcons.ts. `crystals` et `arcane_stones` " +
      "sont utilisés comme coûts de construction dans ConstructionPanel (circuit hybride " +
      "non documenté — à clarifier en V3-C1 avant migration).",
  },

  // ── Stratégiques ────────────────────────────────────────────────────────
  labor_contracts: {
    id: "labor_contracts",
    label: "Contrats de travail",
    category: "strategic",
    legacyKeys: [],
    notes:
      "Absente de toutes les couches actuelles. Produite par ateliers, guildes ou " +
      "organisation humaine — pas récoltée sur la carte. Architecture à concevoir.",
  },
  basic_equipment: {
    id: "basic_equipment",
    label: "Équipement basique",
    category: "strategic",
    legacyKeys: [],
    notes: "Absente du runtime. Nécessaire pour de nombreuses unités du catalogue prototype.",
  },
  intermediate_equipment: {
    id: "intermediate_equipment",
    label: "Équipement intermédiaire",
    category: "strategic",
    legacyKeys: [],
    notes: "Absente du runtime.",
  },
  advanced_equipment: {
    id: "advanced_equipment",
    label: "Équipement avancé",
    category: "strategic",
    legacyKeys: [],
    notes: "Absente du runtime.",
  },
  rare_equipment: {
    id: "rare_equipment",
    label: "Équipement rare",
    category: "strategic",
    legacyKeys: [],
    notes: "Absente du runtime.",
  },
  legendary_equipment: {
    id: "legendary_equipment",
    label: "Équipement légendaire",
    category: "strategic",
    legacyKeys: [],
    notes: "Absente du runtime.",
  },

  // ── Monnaie ─────────────────────────────────────────────────────────────
  fracten: {
    id: "fracten",
    label: "Fracten",
    category: "currency",
    legacyKeys: ["fracten"],
  },
};

// ─── LEGACY_TO_CANONICAL ────────────────────────────────────────────────────
// Mapping déclaratif des anciennes clés runtime V2 vers la clé canonique V3.
// À utiliser comme référence lors des renommages progressifs (V3-C3 et suivants).
// Ne pas appliquer automatiquement — chaque migration nécessite une validation
// explicite et une migration DB.
export const LEGACY_TO_CANONICAL: Record<string, CanonicalResourceId> = {
  // Clés V2 alignées
  food:          "food",
  wood:          "wood",
  stone:         "stone",
  leather_fur:   "leather_fur",
  common_metals: "common_metals",
  fracten:       "fracten",
  // Clés V2 à périmètre trop étroit → canonique plus large
  coal:          "fuel",
  oil:           "fuel",
  herbs:         "common_ingredients",
  // Anciens noms V1 (conservés dans schema.ts legacy)
  fur:           "leather_fur",
  iron:          "common_metals",
  copper:        "common_metals",
  gold:          "fracten",
  // Labels UI orphelins → canonique V3
  rare_metals_alloys: "rare_metals_alloys",
  textiles:           "fine_textiles",
  precious_stones:    "gemstones",
  enchanted_wood:     "precious_wood",
  arcane_stones:      "magical_stones_crystals",
  spirit_stones:      "magical_stones_crystals",
  sacred_stones:      "magical_stones_crystals",
  crystals:           "magical_stones_crystals",
  moonstone:          "gemstones",
  mana_stones:        "magical_stones_crystals",
  ancient_artifacts:  "ancient_relics",
};

// ─── Accesseurs passifs ──────────────────────────────────────────────────────

/** Retourne la définition canonique d'une ressource par id canonique. */
export function getCanonicalResource(
  id: CanonicalResourceId,
): CanonicalResourceDefinition {
  return CANONICAL_RESOURCES[id];
}

/** Résout une clé legacy/UI vers son id canonique V3, ou null si inconnu. */
export function resolveToCanonical(legacyKey: string): CanonicalResourceId | null {
  return LEGACY_TO_CANONICAL[legacyKey] ?? null;
}

/** Retourne toutes les ressources d'une catégorie donnée. */
export function getResourcesByCategory(
  category: CanonicalResourceCategory,
): CanonicalResourceDefinition[] {
  return Object.values(CANONICAL_RESOURCES).filter(r => r.category === category);
}
