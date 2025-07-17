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
      grassland: '#90EE90',
      plains: '#DEB887',
      desert: '#F4A460',
      tundra: '#B0C4DE',
      snow: '#FFFAFA',
      ocean: '#4682B4',
      coast: '#87CEEB',
      hills: '#8B7355',
      mountains: '#696969',
      forest: '#228B22',
      jungle: '#006400'
    };
    return colors[terrain as keyof typeof colors] || '#808080';
  };

  // Get terrain display name
  const getTerrainName = (terrain: string): string => {
    const names = {
      grassland: 'Prairie',
      plains: 'Plaine',
      desert: 'Désert',
      tundra: 'Toundra',
      snow: 'Neige',
      ocean: 'Océan',
      coast: 'Côte',
      hills: 'Collines',
      mountains: 'Montagnes',
      forest: 'Forêt',
      jungle: 'Jungle'
    };
    return names[terrain as keyof typeof names] || terrain;
  };

  // Get resource display name
  const getResourceName = (resource: string): string => {
    const names = {
      gold: 'Or',
      iron: 'Fer',
      horses: 'Chevaux',
      wheat: 'Blé',
      fish: 'Poisson',
      stone: 'Pierre',
      wood: 'Bois',
      oil: 'Pétrole',
      coal: 'Charbon',
      gems: 'Gemmes'
    };
    return names[resource as keyof typeof names] || resource;
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
        <div className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded border border-amber-700" 
            style={{ backgroundColor: getTerrainColor(selectedHex.terrain) }}
          />
          <span className="text-amber-800 font-medium">
            {getTerrainName(selectedHex.terrain)}
          </span>
        </div>
        
        {/* River */}
        {selectedHex.hasRiver && (
          <div className="text-amber-700 text-sm mt-1">
            🌊 Rivière présente
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

      {/* Production Information (if it's a productive tile) */}
      <div className="bg-amber-50 border border-amber-700 rounded p-2">
        <div className="text-amber-900 font-semibold mb-2">📊 Production</div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-amber-700">
            🌾 Nourriture: {selectedHex.food || 0}
          </div>
          <div className="text-amber-700">
            🔨 Production: {selectedHex.production || 0}
          </div>
          <div className="text-amber-700">
            💰 Commerce: {selectedHex.commerce || 0}
          </div>
          <div className="text-amber-700">
            🧪 Science: {selectedHex.science || 0}
          </div>
        </div>
      </div>
    </div>
  );
}