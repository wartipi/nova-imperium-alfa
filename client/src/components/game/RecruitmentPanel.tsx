import { useNovaImperium } from "../../lib/stores/useNovaImperium";
import { usePlayer } from "../../lib/stores/usePlayer";
import { Button } from "../ui/button";
import { getUnitRecruitmentCost, canAffordAction } from "../../lib/game/ActionPointsCosts";
import { useState } from "react";
import { apiStartRecruitment } from "../../lib/api/citiesApi";

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

  if (!currentNovaImperium) return null;

  const units = [
    { id: 'warrior', name: 'Guerrier', cost: { food: 10, common_metals: 5, fracten: 8 }, recruitmentTime: 2, description: 'Unité de base au corps à corps', icon: '⚔️', strength: 4, category: 'Infanterie' },
    { id: 'spearman', name: 'Lancier', cost: { food: 12, common_metals: 8, wood: 4 }, recruitmentTime: 2, description: 'Unité défensive contre la cavalerie', icon: '🗡️', strength: 5, category: 'Infanterie' },
    { id: 'swordsman', name: 'Épéiste', cost: { food: 15, common_metals: 12, fracten: 10 }, recruitmentTime: 3, description: 'Guerrier amélioré avec épée', icon: '🗡️', strength: 7, category: 'Infanterie' },
    
    // Ranged Units - 2-3 tours
    { id: 'archer', name: 'Archer', cost: { food: 8, wood: 10, fracten: 6 }, recruitmentTime: 2, description: 'Unité de tir à distance', icon: '🏹', strength: 3, category: 'Distance' },
    { id: 'crossbowman', name: 'Arbalétrier', cost: { food: 12, wood: 8, common_metals: 6, fracten: 8 }, recruitmentTime: 3, description: 'Tireur d\'élite avec arbalète', icon: '🎯', strength: 5, category: 'Distance' },
    
    // Siege Units - 4-5 tours
    { id: 'catapult', name: 'Catapulte', cost: { wood: 20, common_metals: 15, stone: 10, fracten: 12 }, recruitmentTime: 4, description: 'Engin de siège pour détruire les murs', icon: '🏹', strength: 8, category: 'Siège' },
    { id: 'trebuchet', name: 'Trébuchet', cost: { wood: 25, common_metals: 20, stone: 15, fracten: 18 }, recruitmentTime: 5, description: 'Engin de siège lourd', icon: '🏰', strength: 10, category: 'Siège' },
    
    // Cavalry - 3-4 tours
    { id: 'horseman', name: 'Cavalier', cost: { food: 20, common_metals: 8, fracten: 15 }, recruitmentTime: 3, description: 'Unité montée rapide', icon: '🐎', strength: 6, category: 'Cavalerie' },
    { id: 'knight', name: 'Chevalier', cost: { food: 25, common_metals: 18, fracten: 20, rare_metals_alloys: 3 }, recruitmentTime: 4, description: 'Cavalerie lourde blindée', icon: '🛡️', strength: 9, category: 'Cavalerie' },
    
    // Naval Units - 3-4 tours
    { id: 'galley', name: 'Galère', cost: { wood: 15, common_metals: 8, food: 10, fracten: 12 }, recruitmentTime: 3, description: 'Navire de guerre léger', icon: '🚤', strength: 4, category: 'Marine' },
    { id: 'warship', name: 'Navire de Guerre', cost: { wood: 25, common_metals: 15, food: 15, fracten: 18 }, recruitmentTime: 4, description: 'Navire de combat lourd', icon: '⛵', strength: 7, category: 'Marine' },
    
    // Special Units - 1-3 tours
    { id: 'scout', name: 'Éclaireur', cost: { food: 6, fracten: 4 }, recruitmentTime: 1, description: 'Unité d\'exploration rapide', icon: '🔍', strength: 2, category: 'Spécial' },
    { id: 'settler', name: 'Colon', cost: { food: 25, wood: 15, stone: 10, common_metals: 8, fracten: 20 }, recruitmentTime: 3, description: 'Fonde de nouvelles villes', icon: '🏕️', strength: 0, category: 'Spécial' },
    { id: 'diplomat', name: 'Diplomate', cost: { food: 10, fracten: 15, rare_metals_alloys: 2 }, recruitmentTime: 2, description: 'Négociateur pour les relations', icon: '🤝', strength: 0, category: 'Spécial' },
    { id: 'spy', name: 'Espion', cost: { food: 12, fracten: 18, crystals: 3 }, recruitmentTime: 2, description: 'Unité d\'espionnage et sabotage', icon: '🕵️', strength: 1, category: 'Spécial' }
  ];

  const getResourceIcon = (resource: string): string => {
    const icons: Record<string, string> = {
      food: '🍞',
      fracten: '💰',
      wood: '🪵',
      stone: '🪨',
      common_metals: '⚙️',
      rare_metals_alloys: '🥇',
      crystals: '💠',
      arcane_stones: '⚡',
      leather_fur: '🦊',
    };
    return icons[resource] || '❓';
  };

  const formatResourceCost = (cost: Record<string, number | undefined>): string => {
    return Object.entries(cost)
      .filter(([, amount]) => amount !== undefined && amount > 0)
      .map(([resource, amount]) => `${amount} ${getResourceIcon(resource)}`)
      .join(', ');
  };

  // canAffordUnit : contrôle d'affichage uniquement (AP + ressources Zustand globales).
  // NE contrôle plus la validation des ressources city_inventory — c'est le serveur
  // qui est authoritative via POST /api/cities/:cityId/start-recruitment.
  // Risque : les ressources Zustand (globales) diffèrent de city_inventory (serveur) —
  // l'indicateur peut être incorrect. À réconcilier en V3-D5-F.
  const canAffordUnit = (unitId: string): boolean => {
    const actionCost = getUnitRecruitmentCost(unitId);
    return canAffordAction(actionPoints, actionCost);
  };

  // V3-D5-E : handleRecruit est maintenant serveur-authoritative.
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
        // Construire un message lisible depuis missing[] si disponible
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
        {/* V3-D5-F : coûts indicatifs — le serveur valide city_inventory */}
        <p className="text-xs text-amber-600 italic mb-3">
          Coûts affichés indicatifs. Le serveur valide et débite l'inventaire réel de la ville.
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
            {['Infanterie', 'Distance', 'Siège', 'Cavalerie', 'Marine', 'Spécial'].map(category => {
              const categoryUnits = units.filter(u => u.category === category);
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
                        <span className="text-sm">{unit.icon}</span>
                        <div>
                          <div className="text-xs font-medium">{unit.name}</div>
                          <div className="text-xs text-amber-700">
                            {formatResourceCost(unit.cost)} | {getUnitRecruitmentCost(unit.id)} ⚡
                          </div>
                          <div className="text-xs text-purple-600">
                            🕐 {unit.recruitmentTime} tour{unit.recruitmentTime > 1 ? 's' : ''} | ⚔️ {unit.strength}
                          </div>
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
                          // V3-D5-F : PA indicatifs uniquement — la validation est serveur-authoritative.
                          // canAffordUnit() (PA) n'est plus un verrou UI : on affiche l'info sans bloquer.
                          !canAffordUnit(unit.id) ? `${getUnitRecruitmentCost(unit.id)} PA requis (indicatif)` :
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

      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="text-sm">
          <div className="font-medium mb-2">Armée Actuelle:</div>
          <div className="space-y-1">
            {currentNovaImperium.units.map(unit => (
              <div key={unit.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm">
                    {unit.type === 'warrior' ? '⚔️' : 
                     unit.type === 'archer' ? '🏹' : 
                     unit.type === 'settler' ? '🏕️' : 
                     unit.type === 'scout' ? '🔍' : '👤'}
                  </span>
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
          <div className="space-y-2">
            <div className="text-sm font-medium text-yellow-300">
              {units.find(u => u.id === hoveredUnit)?.name}
            </div>
            <div className="text-sm">
              {units.find(u => u.id === hoveredUnit)?.description}
            </div>
            <div className="border-t border-gray-600 pt-2">
              <div className="text-xs text-gray-300 mb-1">Statistiques:</div>
              <div className="text-sm text-red-400">
                Force: {units.find(u => u.id === hoveredUnit)?.strength}
              </div>
            </div>
            <div className="border-t border-gray-600 pt-2">
              <div className="text-xs text-gray-300 mb-1">Points d'Action:</div>
              <div className="text-sm text-blue-400">
                Coût: {getUnitRecruitmentCost(hoveredUnit)} PA
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}