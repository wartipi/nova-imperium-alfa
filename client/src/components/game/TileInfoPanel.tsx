import { useMap } from "../../lib/stores/useMap";
import { useCivilizations } from "../../lib/stores/useCivilizations";
import { HexTile, City, Unit } from "../../lib/game/types";

export function TileInfoPanel() {
  const { selectedHex, setSelectedHex } = useMap();
  const { civilizations } = useCivilizations();

  if (!selectedHex) return null;

  const handleClose = () => {
    setSelectedHex(null);
  };

  // Find units on this tile
  const unitsOnTile = civilizations.flatMap(civ => 
    civ.units.filter(unit => unit.x === selectedHex.x && unit.y === selectedHex.y)
      .map(unit => ({ ...unit, civColor: civ.color, civName: civ.name }))
  );

  // Find cities on this tile
  const cityOnTile = civilizations.flatMap(civ => 
    civ.cities.filter(city => city.x === selectedHex.x && city.y === selectedHex.y)
      .map(city => ({ ...city, civColor: civ.color, civName: civ.name }))
  )[0];

  // Get terrain color for display
  const getTerrainColor = (terrain: string): string => {
    const colors = {
      wasteland: '#F5F5DC',        // Beige pâle
      forest: '#228B22',           // Vert foncé
      mountains: '#708090',        // Gris pierre
      fertile_land: '#90EE90',     // Vert clair
      hills: '#D2B48C',            // Brun clair
      shallow_water: '#87CEEB',    // Bleu clair
      deep_water: '#191970',       // Bleu foncé
      swamp: '#556B2F',            // Vert olive foncé
      desert: '#FFD700',           // Jaune doré
      sacred_plains: '#F0E68C',    // Blanc doré / beige lumineux
      caves: '#2F2F2F',            // Gris très foncé
      ancient_ruins: '#8B7355',    // Brun-gris
      volcano: '#B22222',          // Rouge foncé
      enchanted_meadow: '#50C878'  // Vert émeraude
    };
    return colors[terrain as keyof typeof colors] || '#808080';
  };

  // Get terrain display name
  const getTerrainName = (terrain: string): string => {
    const names = {
      wasteland: 'Terre en friche',
      forest: 'Forêt',
      mountains: 'Montagne',
      fertile_land: 'Terre fertile',
      hills: 'Colline',
      shallow_water: 'Eau peu profonde',
      deep_water: 'Eau profonde',
      swamp: 'Marais',
      desert: 'Désert',
      sacred_plains: 'Plaine sacrée',
      caves: 'Grotte/Souterrain',
      ancient_ruins: 'Ruines anciennes',
      volcano: 'Volcan',
      enchanted_meadow: 'Prairie enchantée'
    };
    return names[terrain as keyof typeof names] || terrain;
  };

  // Get resource display name
  const getResourceName = (resource: string): string => {
    const names = {
      // Basic resources
      gold: 'Or',
      iron: 'Fer',
      copper: 'Cuivre',
      stone: 'Pierre',
      coal: 'Charbon',
      oil: 'Pétrole',
      wheat: 'Blé',
      cattle: 'Bétail',
      fish: 'Poisson',
      deer: 'Cerf',
      fur: 'Fourrure',
      // Special resources for archipelago world
      herbs: 'Herbes',
      crystals: 'Cristaux',
      sacred_stones: 'Pierres sacrées',
      ancient_artifacts: 'Artefacts anciens',
      sulfur: 'Soufre',
      obsidian: 'Obsidienne',
      crabs: 'Crabes',
      whales: 'Baleines'
    };
    return names[resource as keyof typeof names] || resource;
  };

  // Get terrain symbol/icon
  const getTerrainSymbol = (terrain: string): string => {
    const symbols = {
      wasteland: '⚪',
      forest: '🌲',
      mountains: '⛰️',
      fertile_land: '🌾',
      hills: '🟫',
      shallow_water: '🌊',
      deep_water: '⚓',
      swamp: '🐸',
      desert: '🏜️',
      sacred_plains: '✨',
      caves: '🕳️',
      ancient_ruins: '🏚️',
      volcano: '🌋',
      enchanted_meadow: '🌸'
    };
    return symbols[terrain as keyof typeof symbols] || '⬢';
  };

  return (
    <div className="absolute top-64 right-4 bg-gradient-to-b from-amber-200 via-amber-100 to-amber-200 border-2 border-amber-800 rounded-lg shadow-lg p-4 w-80 max-h-96 overflow-y-auto pointer-events-auto">
      <div className="flex justify-between items-center mb-3">
        <div className="text-amber-900 font-bold text-lg">
          INFORMATIONS DE LA CASE
        </div>
        <button
          onClick={handleClose}
          className="text-amber-800 hover:text-amber-900 text-xl font-bold px-2 py-1 rounded hover:bg-amber-300 transition-colors"
          type="button"
        >
          ✕
        </button>
      </div>
      
      {/* Coordinates */}
      <div className="bg-amber-50 border border-amber-700 rounded p-2 mb-3">
        <div className="text-amber-800 font-semibold text-sm">
          Coordonnées: ({selectedHex.x}, {selectedHex.y})
        </div>
      </div>

      {/* Terrain Information */}
      <div className="bg-amber-50 border border-amber-700 rounded p-2 mb-3">
        <div className="text-amber-900 font-semibold mb-2">🌍 Terrain</div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-lg border-2 border-amber-700 flex items-center justify-center text-lg" 
              style={{ backgroundColor: getTerrainColor(selectedHex.terrain) }}
            >
              {getTerrainSymbol(selectedHex.terrain)}
            </div>
            <div>
              <div className="text-amber-800 font-medium">
                {getTerrainName(selectedHex.terrain)}
              </div>
              <div className="text-amber-600 text-xs">
                Type #{(() => {
                  const terrainTypes = {
                    wasteland: 1, forest: 2, mountains: 3, fertile_land: 4, hills: 5, 
                    shallow_water: 6, deep_water: 7, swamp: 8, desert: 9, sacred_plains: 10,
                    caves: 11, ancient_ruins: 12, volcano: 13, enchanted_meadow: 14
                  };
                  return terrainTypes[selectedHex.terrain as keyof typeof terrainTypes] || '?';
                })()}
              </div>
            </div>
          </div>
        </div>
        
        {/* Production Values */}
        <div className="mt-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-green-600">🌾</span>
            <span className="text-amber-700">Nourriture: {selectedHex.food}</span>
          </div>
        </div>
        
        {/* River */}
        {selectedHex.hasRiver && (
          <div className="text-amber-700 text-sm mt-2 flex items-center gap-1">
            <span className="text-blue-600">🌊</span>
            <span>Rivière présente</span>
          </div>
        )}
      </div>

      {/* Resource Information */}
      {selectedHex.resource && (
        <div className="bg-amber-50 border border-amber-700 rounded p-2 mb-3">
          <div className="text-amber-900 font-semibold mb-2">💎 Ressource</div>
          <div className="text-amber-800 font-medium">
            {getResourceName(selectedHex.resource)}
          </div>
        </div>
      )}

      {/* City Information */}
      {cityOnTile && (
        <div className="bg-amber-50 border border-amber-700 rounded p-2 mb-3">
          <div className="text-amber-900 font-semibold mb-2">🏛️ Ville</div>
          <div className="flex items-center gap-2 mb-1">
            <div 
              className="w-3 h-3 rounded-full border border-amber-700" 
              style={{ backgroundColor: cityOnTile.civColor }}
            />
            <span className="text-amber-800 font-medium">{cityOnTile.name}</span>
          </div>
          <div className="text-amber-700 text-sm">
            Population: {cityOnTile.population}
          </div>
          <div className="text-amber-700 text-sm">
            Civilisation: {cityOnTile.civName}
          </div>
          
          {/* Buildings */}
          {cityOnTile.buildings && cityOnTile.buildings.length > 0 && (
            <div className="mt-2">
              <div className="text-amber-800 font-medium text-sm mb-1">Bâtiments:</div>
              <div className="space-y-1">
                {cityOnTile.buildings.map((building, index) => (
                  <div key={index} className="text-amber-700 text-xs">
                    • {building.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Units Information */}
      {unitsOnTile.length > 0 && (
        <div className="bg-amber-50 border border-amber-700 rounded p-2 mb-3">
          <div className="text-amber-900 font-semibold mb-2">
            ⚔️ Unités ({unitsOnTile.length})
          </div>
          <div className="space-y-2">
            {unitsOnTile.map((unit, index) => (
              <div key={index} className="border-b border-amber-300 pb-2 last:border-b-0 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <div 
                    className="w-3 h-3 rounded-full border border-amber-700" 
                    style={{ backgroundColor: unit.civColor }}
                  />
                  <span className="text-amber-800 font-medium capitalize">{unit.type}</span>
                </div>
                <div className="text-amber-700 text-sm">
                  Force: {unit.attack}/{unit.defense}
                </div>
                <div className="text-amber-700 text-sm">
                  Santé: {unit.health}/{unit.maxHealth}
                </div>
                <div className="text-amber-700 text-sm">
                  Mouvement: {unit.movement}/{unit.maxMovement}
                </div>
                <div className="text-amber-700 text-sm">
                  Civilisation: {unit.civName}
                </div>
                {unit.experience > 0 && (
                  <div className="text-amber-700 text-sm">
                    Expérience: {unit.experience}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}


    </div>
  );
}