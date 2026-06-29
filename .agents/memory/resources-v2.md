---
name: Resources V2 migration
description: Migration ressources V1→V2 Nova Imperium — état de la migration et mapping officiel
---

# Mapping V1 → V2

| V1 (legacy) | V2 (officiel) | Tables concernées |
|---|---|---|
| gold (monnaie) | fracten | faction_economy, player_bank, city_pending_harvest, city_inventory, player_transport, player_market_box |
| iron + copper | common_metals | même tables |
| fur | leather_fur | même tables |
| mana | crystals | types.ts uniquement |
| ancient_knowledge | arcane_stones | types.ts uniquement |
| precious_metals | rare_metals_alloys | types.ts uniquement |
| wheat/cattle/fish | food | types.ts uniquement |
| deer | leather_fur | types.ts uniquement |
| sulfur | coal | types.ts uniquement |
| obsidian | stone | types.ts uniquement |

# État de la migration Phase 3 (DB)

- **Passe 1 (FAITE)** : colonnes V2 ajoutées (ADD COLUMN IF NOT EXISTS) + backfill SQL exécuté
- **Passe 2 (À FAIRE)** : DROP old columns (gold, iron, copper, fur) des tables économiques — après validation complète
- **market_trades.totalGold** : renommer en totalFracten est optionnel (décision future)
- **cities table** : colonnes fractenPerTurn/commonMetalsPerTurn/leatherFurPerTurn NON encore ajoutées

# Fichiers clés modifiés

- `client/src/lib/game/types.ts` — ResourceType V2, interface Resources V2 (fracten, common_metals, leather_fur)
- `client/src/lib/systems/ResourceRevealSystem.ts` — catalogue V2 complet
- `client/src/lib/game/MapGenerator.ts` — getSuitableResources + applyResourceYields V2
- `client/src/lib/game/TerrainCosts.ts` — 'plains' ajouté au Record<TerrainType, number>
- `client/src/lib/stores/useNovaImperium.tsx` — resources init V2 + casts as Resources + as NovaImperium[]
- `client/src/components/game/ConstructionPanel.tsx` — coûts bâtiments V2
- `client/src/components/game/RecruitmentPanel.tsx` — coûts unités V2
- `shared/schema.ts` — colonnes fracten/common_metals/leather_fur en passe additive sur 6 tables

# Gardes importantes

- Ne jamais supprimer les colonnes V1 (gold, iron, copper, fur) avant validation complète Passe 2
- Les erreurs TS pré-existantes (buildingEffects, cityService, marketService, etc.) sont hors périmètre V2
- useNovaImperium cast pattern : `as Resources` sur Object.fromEntries spread, `as NovaImperium[]` sur le retour du set()

**Why:** Migration additive pour zéro downtime — supprimer les vieilles colonnes seulement quand tout le code serveur est mis à jour pour utiliser les nouvelles.
