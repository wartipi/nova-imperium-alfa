import { useNovaImperium } from "../../lib/stores/useNovaImperium";
import { usePlayer } from "../../lib/stores/usePlayer";
import { Button } from "../ui/button";
import { getUnitRecruitmentCost, canAffordAction } from "../../lib/game/ActionPointsCosts";
import { useState, useEffect } from "react";
import { apiStartRecruitment, apiGetRecruitmentCosts } from "../../lib/api/citiesApi";
import type { RuntimeRecruitmentCostEntry } from "../../lib/api/citiesApi";

// ── Coûts PA indicatifs pour les 15 IDs prototype (V3-D6-D) ──────────────────
// PA restent indicatifs — pas de validation serveur, pas de blocage UI.
const getIndicativeActionPointCost = (unitId: string): number => {
  const prototypeApCosts: Record<string, number> = {
    militia:          1,
    garrison:         2,
    patrollers:       1,
    scouts:           1,
    light_infantry:   1,
    regular_infantry: 2,
    noble_infantry:   2,
    shock_troops:     2,
    bow_infantry:     1,
    crossbow_infantry:2,
    sappers:          2,
    field_engineers:  2,
    raid_troops:      1,
    hunters:          1,
    pikemen:          2,
  };
  return prototypeApCosts[unitId] ?? getUnitRecruitmentCost(unitId);
};

// ── Icônes par unitType (15 prototype + fallback legacy) ──────────────────────
// Couvre les IDs prototype et les anciennes unités qui peuvent encore exister en DB.
const getUnitIcon = (unitType: string): string => {
  const iconMap: Record<string, string> = {
    // ── Prototype ─────────────────────────────────────────────────────────────
    militia:          '🛡️',
    garrison:         '🏰',
    patrollers:       '👁️',
    scouts:           '🔭',
    light_infantry:   '🏃',
    regular_infantry: '⚔️',
    noble_infantry:   '👑',
    shock_troops:     '💥',
    bow_infantry:     '🏹',
    crossbow_infantry:'🎯',
    sappers:          '⛏️',
    field_engineers:  '🔧',
    raid_troops:      '🔥',
    hunters:          '🌿',
    pikemen:          '🪛',
    // ── Legacy (unités déjà en DB, non recrutables depuis l'UI) ────────────────
    warrior:   '⚔️',
    spearman:  '🗡️',
    swordsman: '🗡️',
    archer:    '🏹',
    crossbowman:'🎯',
    catapult:  '🏹',
    trebuchet: '🏰',
    horseman:  '🐎',
    knight:    '🛡️',
    galley:    '🚤',
    warship:   '⛵',
    scout:     '🔍',
    settler:   '🏕️',
    diplomat:  '🤝',
    spy:       '🕵️',
  };
  return iconMap[unitType] ?? '👤';
};

// ── Catalogue UI des 15 unités prototype ─────────────────────────────────────
// Fallback local : coûts/durées depuis RUNTIME_RECRUITMENT_COSTS V3-D6-C.
// Ressources autorisées : food, wood, stone, common_metals, common_textiles,
//   labor_contracts, basic_equipment. Aucune ressource fracten/rare/legacy.
const PROTOTYPE_UNITS = [
  // ── Infanterie légère ────────────────────────────────────────────────────
  { id: 'militia',          name: 'Milice',                 category: 'Infanterie légère', description: 'Unité commune de défense locale.',                          cost: { food: 2, labor_contracts: 1 },                                                            recruitmentTime: 1, strength: 2 },
  { id: 'garrison',         name: 'Garnison',               category: 'Infanterie légère', description: 'Unité défensive lente, adaptée à la protection d\'une ville.', cost: { food: 2, labor_contracts: 1, wood: 1 },                                                recruitmentTime: 1, strength: 3 },
  { id: 'patrollers',       name: 'Patrouilleurs',          category: 'Infanterie légère', description: 'Unité rapide de surveillance et contrôle de zone.',           cost: { food: 3, labor_contracts: 1, basic_equipment: 1 },                                       recruitmentTime: 2, strength: 2 },
  { id: 'scouts',           name: 'Éclaireurs',             category: 'Infanterie légère', description: 'Unité très mobile pour l\'exploration.',                      cost: { food: 3, labor_contracts: 1, basic_equipment: 1 },                                       recruitmentTime: 2, strength: 1 },
  { id: 'light_infantry',   name: 'Infanterie légère',      category: 'Infanterie légère', description: 'Unité mobile de ligne légère.',                              cost: { food: 4, labor_contracts: 1, basic_equipment: 1 },                                       recruitmentTime: 2, strength: 4 },
  // ── Infanterie lourde ────────────────────────────────────────────────────
  { id: 'regular_infantry', name: 'Infanterie régulière',   category: 'Infanterie lourde', description: 'Unité robuste de ligne.',                                    cost: { food: 4, labor_contracts: 1, basic_equipment: 1 },                                       recruitmentTime: 3, strength: 5 },
  { id: 'noble_infantry',   name: 'Infanterie noble',       category: 'Infanterie lourde', description: 'Unité lourde et coûteuse.',                                  cost: { food: 5, labor_contracts: 1, basic_equipment: 2 },                                       recruitmentTime: 4, strength: 6 },
  { id: 'shock_troops',     name: 'Troupe de choc',         category: 'Infanterie lourde', description: 'Unité offensive spécialisée.',                               cost: { food: 5, labor_contracts: 1, basic_equipment: 2 },                                       recruitmentTime: 4, strength: 6 },
  // ── Distance ─────────────────────────────────────────────────────────────
  { id: 'bow_infantry',      name: 'Infanterie à arc',      category: 'Distance',          description: 'Unité de projectile léger.',                                 cost: { food: 4, labor_contracts: 1, wood: 1, common_textiles: 1 },                              recruitmentTime: 2, strength: 3 },
  { id: 'crossbow_infantry', name: 'Infanterie à arbalète', category: 'Distance',          description: 'Unité de projectile lourd.',                                 cost: { food: 4, labor_contracts: 1, wood: 1, common_metals: 1, basic_equipment: 1 },           recruitmentTime: 3, strength: 4 },
  // ── Technique ────────────────────────────────────────────────────────────
  { id: 'sappers',          name: 'Sapeurs',                category: 'Technique',         description: 'Unité technique pour opérations de siège et sabotage.',       cost: { food: 4, labor_contracts: 1, wood: 1, common_metals: 1, basic_equipment: 1 },           recruitmentTime: 3, strength: 2 },
  { id: 'field_engineers',  name: 'Ingénieurs de campagne', category: 'Technique',         description: 'Unité technique avancée de terrain.',                        cost: { food: 4, labor_contracts: 1, wood: 1, common_metals: 1, common_textiles: 1, basic_equipment: 1 }, recruitmentTime: 4, strength: 2 },
  // ── Raid / Soutien ───────────────────────────────────────────────────────
  { id: 'raid_troops',      name: 'Troupe de raid',         category: 'Raid / Soutien',    description: 'Unité mobile pour pression économique.',                      cost: { food: 4, labor_contracts: 1, basic_equipment: 1 },                                       recruitmentTime: 3, strength: 4 },
  { id: 'hunters',          name: 'Chasseurs',              category: 'Raid / Soutien',    description: 'Unité légère de soutien et survie.',                         cost: { food: 3, labor_contracts: 1, wood: 1 },                                                  recruitmentTime: 2, strength: 3 },
  // ── Contrôle ─────────────────────────────────────────────────────────────
  { id: 'pikemen',          name: 'Piquiers',               category: 'Contrôle',          description: 'Unité de contrôle défensif.',                                cost: { food: 4, labor_contracts: 1, wood: 1, common_metals: 1, basic_equipment: 1 },           recruitmentTime: 3, strength: 4 },
] as const;

const PROTOTYPE_CATEGORIES = [
  'Infanterie légère',
  'Infanterie lourde',
  'Distance',
  'Technique',
  'Raid / Soutien',
  'Contrôle',
] as const;

export function RecruitmentPanel() {
  // V3-D5-E : trainUnit n'est plus utilisé dans ce composant (remplacé par apiStartRecruitment).
  // trainUnit reste présent dans le store pour d'éventuels autres appelants.
  const { currentNovaImperium, hydrateCitiesFromServer } = useNovaImperium();
  const { actionPoints } = usePlayer();
  const [hoveredUnit, setHoveredUnit] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  // isRecruiting : clé = city.id (string) — désactive les boutons pendant l'appel serveur
  const [isRecruiting, setIsRecruiting] = useState<Record<string, boolean>>({});
  // cityErrors : message d'erreur affiché sous chaque ville
  const [cityErrors, setCityErrors] = useState<Record<string, string>>({});
  // V3-D5-G : coûts serveur chargés depuis GET /api/cities/recruitment-costs
  const [serverRecruitmentCosts, setServerRecruitmentCosts] =
    useState<Record<string, RuntimeRecruitmentCostEntry> | null>(null);

  // Charger les coûts serveur au montage — fallback local si erreur API
  useEffect(() => {
    apiGetRecruitmentCosts()
      .then(res => setServerRecruitmentCosts(res.costs))
      .catch(err => {
        console.warn("[RecruitmentPanel] Impossible de charger les coûts serveur — fallback local:", err);
      });
  }, []);

  if (!currentNovaImperium) return null;

  const getResourceIcon = (resource: string): string => {
    const icons: Record<string, string> = {
      food:             '🍞',
      wood:             '🪵',
      stone:            '🪨',
      common_metals:    '⚙️',
      common_textiles:  '🧶',
      labor_contracts:  '📜',
      basic_equipment:  '🛡️',
    };
    return icons[resource] || '❓';
  };

  const formatResourceCost = (cost: Record<string, number | undefined>): string => {
    return Object.entries(cost)
      .filter(([, amount]) => amount !== undefined && amount > 0)
      .map(([resource, amount]) => `${amount} ${getResourceIcon(resource)}`)
      .join(', ');
  };

  // canAffordUnit : contrôle d'affichage uniquement (PA indicatifs).
  // Validation authoritative = serveur via POST /api/cities/:cityId/start-recruitment.
  const canAffordUnit = (unitId: string): boolean => {
    const actionCost = getIndicativeActionPointCost(unitId);
    return canAffordAction(actionPoints, actionCost);
  };

  // V3-D5-E : handleRecruit est serveur-authoritative.
  // Seul unitType est envoyé au serveur — pas de coût ni de durée depuis le client.
  // Le débit city_inventory se fait atomiquement côté serveur (V3-D5-C2).
  const handleRecruit = async (unitId: string, cityId: string) => {
    if (!currentNovaImperium) return;

    setIsRecruiting(prev => ({ ...prev, [cityId]: true }));
    setCityErrors(prev => ({ ...prev, [cityId]: '' }));

    try {
      await apiStartRecruitment(Number(cityId), unitId);
      // Succès : rafraîchir l'état des villes depuis le serveur pour afficher
      // la production en cours et l'inventaire mis à jour.
      await hydrateCitiesFromServer();
    } catch (err: any) {
      const body = err?.body ?? {};
      if (body.error === 'PRODUCTION_ALREADY_ACTIVE') {
        setCityErrors(prev => ({
          ...prev,
          [cityId]: 'Une production est déjà en cours dans cette ville.',
        }));
      } else if (body.error === 'INSUFFICIENT_CITY_INVENTORY') {
        const missing: { resource: string; shortage: number }[] = body.missing ?? [];
        const detail = missing.length > 0
          ? missing.map(m => `${m.resource} +${m.shortage}`).join(', ')
          : null;
        setCityErrors(prev => ({
          ...prev,
          [cityId]: detail
            ? `Ressources insuffisantes : ${detail}.`
            : 'Ressources insuffisantes dans l\'inventaire de la ville.',
        }));
      } else {
        console.error('[handleRecruit] Erreur inattendue:', err);
        setCityErrors(prev => ({
          ...prev,
          [cityId]: 'Impossible de démarrer le recrutement.',
        }));
      }
    } finally {
      setIsRecruiting(prev => ({ ...prev, [cityId]: false }));
    }
  };

  const handleMouseEnter = (unitId: string, event: React.MouseEvent) => {
    setHoveredUnit(unitId);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredUnit(null);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (hoveredUnit) {
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="font-bold text-base mb-1">Recrutement d'Unités</h4>
        {/* V3-D5-G : source des coûts affichés */}
        <p className="text-xs text-amber-600 italic mb-3">
          {serverRecruitmentCosts
            ? 'Coûts affichés : catalogue serveur.'
            : 'Coûts affichés : fallback local, validation finale serveur.'}
        </p>
      </div>

      {currentNovaImperium.cities.map(city => (
        <div key={city.id} className="bg-amber-50 border border-amber-700 rounded p-3">
          <div className="font-medium text-sm mb-2">{city.name}</div>
          {city.currentProduction && city.currentProduction.type === 'unit' ? (
            <div className="mb-3">
              <div className="text-xs text-amber-700">En cours:</div>
              <div className="text-sm font-medium">{city.currentProduction.name}</div>
              <div className="w-full bg-amber-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (city.productionProgress / city.currentProduction.cost) * 100)}%` }}
                ></div>
              </div>
              <div className="text-xs text-amber-700 mt-1">
                🕐 {city.productionProgress}/{city.currentProduction.cost} tours
              </div>
            </div>
          ) : (
            <div className="text-xs text-amber-700 mb-3">Aucun recrutement en cours</div>
          )}

          {/* Erreur de recrutement — affichée sous la barre de progression */}
          {cityErrors[city.id] && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1 mb-2">
              {cityErrors[city.id]}
            </div>
          )}

          <div className="space-y-3">
            {PROTOTYPE_CATEGORIES.map(category => {
              const categoryUnits = PROTOTYPE_UNITS.filter(u => u.category === category);
              return (
                <div key={category} className="space-y-1">
                  <div className="text-xs font-bold text-amber-800 border-b border-amber-300 pb-1">
                    {category}
                  </div>
                  {categoryUnits.map(unit => (
                    <div 
                      key={unit.id} 
                      className="flex items-center justify-between"
                      onMouseEnter={(e) => handleMouseEnter(unit.id, e)}
                      onMouseLeave={handleMouseLeave}
                      onMouseMove={handleMouseMove}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{getUnitIcon(unit.id)}</span>
                        <div>
                          {/* V3-D6-D : coûts serveur si disponibles, fallback local sinon */}
                          {(() => {
                            const serverEntry = serverRecruitmentCosts?.[unit.id];
                            const displayCost = serverEntry ? serverEntry.cost : unit.cost;
                            const displayDuration = serverEntry ? serverEntry.duration : unit.recruitmentTime;
                            const apCost = getIndicativeActionPointCost(unit.id);
                            return (
                              <>
                                <div className="text-xs font-medium">{unit.name}</div>
                                <div className="text-xs text-amber-700">
                                  {formatResourceCost(displayCost as Record<string, number | undefined>)} | {apCost} ⚡
                                </div>
                                <div className="text-xs text-purple-600">
                                  🕐 {displayDuration} tour{displayDuration > 1 ? 's' : ''} | ⚔️ {unit.strength}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleRecruit(unit.id, city.id)}
                        disabled={
                          city.currentProduction !== null ||
                          !!isRecruiting[city.id]
                        }
                        className="text-xs bg-amber-600 hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap"
                        title={
                          city.currentProduction !== null ? 'Ville occupée' :
                          isRecruiting[city.id] ? 'Recrutement en cours…' :
                          // PA indicatifs uniquement — validation serveur-authoritative.
                          !canAffordUnit(unit.id) ? `${getIndicativeActionPointCost(unit.id)} PA requis (indicatif)` :
                          'Recruter cette unité'
                        }
                      >
                        {isRecruiting[city.id] ? '…' :
                         city.currentProduction !== null ? 'Occupé' : 'Recruter'}
                      </Button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Armée Actuelle — affiche toutes les unités en DB, y compris legacy */}
      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="text-sm">
          <div className="font-medium mb-2">Armée Actuelle:</div>
          <div className="space-y-1">
            {currentNovaImperium.units.map(unit => (
              <div key={unit.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{getUnitIcon(unit.type)}</span>
                  <div>
                    <div className="text-xs font-medium">{unit.name}</div>
                    <div className="text-xs text-amber-700">
                      Pos: ({unit.x}, {unit.y}) | Santé: {unit.health}/{unit.maxHealth}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-amber-700">
                  Exp: {unit.experience}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Tooltip */}
      {hoveredUnit && (
        <div 
          className="fixed z-50 bg-gray-800 text-white p-3 rounded shadow-lg max-w-sm pointer-events-none"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          {(() => {
            const unit = PROTOTYPE_UNITS.find(u => u.id === hoveredUnit);
            if (!unit) return null;
            const apCost = getIndicativeActionPointCost(hoveredUnit);
            return (
              <div className="space-y-2">
                <div className="text-sm font-medium text-yellow-300">
                  {getUnitIcon(unit.id)} {unit.name}
                </div>
                <div className="text-sm">
                  {unit.description}
                </div>
                <div className="border-t border-gray-600 pt-2">
                  <div className="text-xs text-gray-300 mb-1">Statistiques:</div>
                  <div className="text-sm text-red-400">
                    Force: {unit.strength}
                  </div>
                  <div className="text-xs text-gray-400">
                    Catégorie: {unit.category}
                  </div>
                </div>
                <div className="border-t border-gray-600 pt-2">
                  <div className="text-xs text-gray-300 mb-1">Points d'Action (indicatifs) :</div>
                  <div className="text-sm text-blue-400">
                    Requis indicatif : {apCost} PA
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
