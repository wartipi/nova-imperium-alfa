// ─── shared/tileModifiers.ts ───────────────────────────────────────────────────
// RESSOURCES V3-B — Catalogue déclaratif et passif des "modifieurs de case".
//
// Ce fichier NE BRANCHE RIEN. Il ne remplace aucune logique existante dans
// server/seeds/mapSeed.ts, server/seeds/backfillTileMetadata.ts,
// server/seeds/updateResources.ts ou server/buildingEffects.ts.
//
// Objectif : formaliser, dans une seule source de vérité typée, la distinction
// conceptuelle entre :
//   - EconomicResourceType : ressources économiques Tier 1 (server/buildingEffects.ts,
//     colonnes cities.*_per_turn) — ce que produisent les bâtiments.
//   - TileModifierId : traits/marqueurs bruts posés sur une case par la génération
//     de carte (map_tiles.resource_type / metadata.resources) — ce qu'une case
//     "contient" avant exploitation.
//
// Un TileModifier se convertit en une ou plusieurs EconomicResourceType quand un
// bâtiment compatible est construit dessus. Cette conversion existe déjà de façon
// IMPLICITE et codée en dur (BUILDING_RESOURCE_PREREQS + BUILDING_PRODUCTION dans
// server/buildingEffects.ts) ; TILE_MODIFIER_YIELDS ci-dessous ne fait que
// DOCUMENTER cette conversion existante de façon déclarative, sans la remplacer.
//
// Aucun système runtime ne lit ce fichier pour l'instant.
// ─────────────────────────────────────────────────────────────────────────────

// ─── EconomicResourceType ──────────────────────────────────────────────────────
// Répliqué localement (pas d'import server/ → shared/) depuis T1Material
// (server/buildingEffects.ts). Garder ces deux listes synchronisées manuellement
// tant qu'aucun partage de type shared n'est mis en place pour buildingEffects.ts.
export type EconomicResourceType =
  | "food"
  | "wood"
  | "stone"
  | "coal"
  | "oil"
  | "herbs"
  | "common_metals"
  | "leather_fur";

// ─── TileModifierId ─────────────────────────────────────────────────────────────
// Valeurs confirmées par audit (présentes dans TERRAIN_RESOURCES de mapSeed.ts,
// backfillTileMetadata.ts et updateResources.ts — les trois copies sont identiques
// à ce jour) :
//   deer, fur, wheat, cattle, iron, copper, coal, stone, oil, herbs,
//   sacred_stones, crystals, ancient_artifacts, fish
//
// Valeurs présentes UNIQUEMENT dans les tables d'affichage UI (ResourceIcons.ts,
// GameEngine.ts, TileInfoPanel.tsx, UnifiedTerritoryPanel.tsx) mais jamais
// générées par TERRAIN_RESOURCES à ce jour — donc actuellement mortes côté
// génération de carte. Conservées ici pour cohérence avec l'UI existante, mais
// marquées explicitement comme non générées :
//   crabs, whales, sulfur, obsidian
export type TileModifierId =
  // ─ Confirmés générés (TERRAIN_RESOURCES) ─
  | "deer"
  | "fur"
  | "wheat"
  | "cattle"
  | "fish"
  | "iron"
  | "copper"
  | "coal"
  | "stone"
  | "oil"
  | "herbs"
  | "crystals"
  | "sacred_stones"
  | "ancient_artifacts"
  // ─ Présents en UI uniquement, non générés par TERRAIN_RESOURCES à ce jour ─
  | "crabs"
  | "whales"
  | "sulfur"
  | "obsidian";

// Sous-ensemble des TileModifierId effectivement produits par la génération de
// carte actuelle (server/seeds/mapSeed.ts::TERRAIN_RESOURCES et ses deux copies).
export const GENERATED_TILE_MODIFIERS: readonly TileModifierId[] = [
  "deer",
  "fur",
  "wheat",
  "cattle",
  "fish",
  "iron",
  "copper",
  "coal",
  "stone",
  "oil",
  "herbs",
  "crystals",
  "sacred_stones",
  "ancient_artifacts",
];

// TileModifierId présents dans les tables UI mais absents de toute génération de
// carte actuelle. À ne pas utiliser comme prérequis de bâtiment tant qu'aucun
// terrain ne les génère réellement.
export const UI_ONLY_TILE_MODIFIERS: readonly TileModifierId[] = [
  "crabs",
  "whales",
  "sulfur",
  "obsidian",
];

// ─── TILE_MODIFIER_YIELDS ───────────────────────────────────────────────────────
// Documentation déclarative de la conversion TileModifier → EconomicResourceType.
// Reflète fidèlement ce que fait déjà BUILDING_PRODUCTION combiné à
// BUILDING_RESOURCE_PREREQS dans server/buildingEffects.ts, sans le modifier :
//   - hunting_post   (prereq: deer | fur)      → produit leather_fur + food
//   - herbalist_house(prereq: herbs)           → produit herbs
//   - farm           (prereq: wheat | cattle)  → produit food
//   - fishing_post   (prereq: fish)            → produit food
//   - mine           (prereq: stone|iron|copper|coal) → produit stone + common_metals
//   - advanced_mine  (prereq: iron|copper|coal)       → produit common_metals + coal
//   - oil_camp       (prereq: oil)             → produit oil
//
// Les modifieurs sans bâtiment d'exploitation connu (crystals, sacred_stones,
// ancient_artifacts, crabs, whales, sulfur, obsidian) n'ont pas d'équivalent
// économique Tier 1 actuel — laissés vides intentionnellement (pas d'invention).
export const TILE_MODIFIER_YIELDS: Partial<
  Record<TileModifierId, Partial<Record<EconomicResourceType, number>>>
> = {
  deer:   { food: 1, leather_fur: 1 },
  fur:    { leather_fur: 1 },
  wheat:  { food: 1 },
  cattle: { food: 1, leather_fur: 1 },
  fish:   { food: 1 },
  herbs:  { herbs: 1 },
  iron:   { common_metals: 1 },
  copper: { common_metals: 1 },
  coal:   { common_metals: 1, coal: 1 },
  stone:  { stone: 1 },
  oil:    { oil: 1 },

  // Pas d'équivalent économique Tier 1 défini à ce jour — intentionnellement vide.
  crystals: {},
  sacred_stones: {},
  ancient_artifacts: {},
  crabs: {},
  whales: {},
  sulfur: {},
  obsidian: {},
};

// ─── TileModifierDefinition ─────────────────────────────────────────────────────
// Fiche descriptive complète d'un modifieur de case : identifiant, label FR,
// catégorie, statut de génération réelle et rendement économique.
// category = classification thématique du modifieur (affichage/regroupement futur) :
//   - animal  : ressource faunique (deer, cattle, fur, fish, crabs, whales)
//   - plant   : ressource végétale (wheat, herbs)
//   - mineral : minerai/matériau brut (iron, copper, coal, stone, sulfur, obsidian, crystals)
//   - site    : site spécial exploitable (ancient_artifacts, sacred_stones)
//   - coastal : réservé aux modifieurs liés spécifiquement au littoral (aucun à ce jour)
//   - unknown : non catégorisé (fallback, non utilisé actuellement)
export interface TileModifierDefinition {
  id: TileModifierId;
  label: string;
  category:
    | "animal"
    | "plant"
    | "mineral"
    | "site"
    | "coastal"
    | "unknown";
  generated: boolean;
  yields: Partial<Record<EconomicResourceType, number>>;
}

// ─── TILE_MODIFIERS ─────────────────────────────────────────────────────────────
// Catalogue complet : une entrée par TileModifierId, fusionnant label FR,
// catégorie, statut `generated` (aligné sur GENERATED_TILE_MODIFIERS /
// UI_ONLY_TILE_MODIFIERS) et rendement (aligné sur TILE_MODIFIER_YIELDS).
// Labels FR repris tels quels des tables d'affichage existantes
// (ResourceIcons.ts / TileInfoPanel.tsx / UnifiedTerritoryPanel.tsx) pour rester
// cohérent avec l'UI actuelle.
export const TILE_MODIFIERS: Record<TileModifierId, TileModifierDefinition> = {
  deer: {
    id: "deer",
    label: "Cerf",
    category: "animal",
    generated: true,
    yields: TILE_MODIFIER_YIELDS.deer!,
  },
  fur: {
    id: "fur",
    label: "Fourrure",
    category: "animal",
    generated: true,
    yields: TILE_MODIFIER_YIELDS.fur!,
  },
  wheat: {
    id: "wheat",
    label: "Blé",
    category: "plant",
    generated: true,
    yields: TILE_MODIFIER_YIELDS.wheat!,
  },
  cattle: {
    id: "cattle",
    label: "Bétail",
    category: "animal",
    generated: true,
    yields: TILE_MODIFIER_YIELDS.cattle!,
  },
  fish: {
    id: "fish",
    label: "Poisson",
    category: "animal",
    generated: true,
    yields: TILE_MODIFIER_YIELDS.fish!,
  },
  iron: {
    id: "iron",
    label: "Fer",
    category: "mineral",
    generated: true,
    yields: TILE_MODIFIER_YIELDS.iron!,
  },
  copper: {
    id: "copper",
    label: "Cuivre",
    category: "mineral",
    generated: true,
    yields: TILE_MODIFIER_YIELDS.copper!,
  },
  coal: {
    id: "coal",
    label: "Charbon",
    category: "mineral",
    generated: true,
    yields: TILE_MODIFIER_YIELDS.coal!,
  },
  stone: {
    id: "stone",
    label: "Pierre",
    category: "mineral",
    generated: true,
    yields: TILE_MODIFIER_YIELDS.stone!,
  },
  oil: {
    id: "oil",
    label: "Pétrole",
    category: "mineral",
    generated: true,
    yields: TILE_MODIFIER_YIELDS.oil!,
  },
  herbs: {
    id: "herbs",
    label: "Herbes",
    category: "plant",
    generated: true,
    yields: TILE_MODIFIER_YIELDS.herbs!,
  },
  crystals: {
    id: "crystals",
    label: "Cristaux",
    category: "mineral",
    generated: true,
    yields: TILE_MODIFIER_YIELDS.crystals!,
  },
  sacred_stones: {
    id: "sacred_stones",
    label: "Pierres sacrées",
    category: "site",
    generated: true,
    yields: TILE_MODIFIER_YIELDS.sacred_stones!,
  },
  ancient_artifacts: {
    id: "ancient_artifacts",
    label: "Artefacts anciens",
    category: "site",
    generated: true,
    yields: TILE_MODIFIER_YIELDS.ancient_artifacts!,
  },
  crabs: {
    id: "crabs",
    label: "Crabes",
    category: "animal",
    generated: false,
    yields: TILE_MODIFIER_YIELDS.crabs!,
  },
  whales: {
    id: "whales",
    label: "Baleines",
    category: "animal",
    generated: false,
    yields: TILE_MODIFIER_YIELDS.whales!,
  },
  sulfur: {
    id: "sulfur",
    label: "Soufre",
    category: "mineral",
    generated: false,
    yields: TILE_MODIFIER_YIELDS.sulfur!,
  },
  obsidian: {
    id: "obsidian",
    label: "Obsidienne",
    category: "mineral",
    generated: false,
    yields: TILE_MODIFIER_YIELDS.obsidian!,
  },
};

// ─── getTileModifierYield ────────────────────────────────────────────────────────
// Accesseur passif : retourne le rendement économique déclaré d'un modifieur,
// ou {} si le modifieur n'a pas d'équivalent économique Tier 1 défini.
// N'est appelé par aucun système runtime à ce jour (fichier non branché).
export function getTileModifierYield(
  modifierId: TileModifierId,
): Partial<Record<EconomicResourceType, number>> {
  return TILE_MODIFIERS[modifierId]?.yields ?? {};
}
