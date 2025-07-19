import { useCivilizations } from "../../lib/stores/useCivilizations";
import { useMap } from "../../lib/stores/useMap";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { Unit } from "../../lib/game/types";

export function UnitPanel() {
  const { currentCivilization, selectedUnit, selectUnit, moveUnit, attackWithUnit } = useCivilizations();
  const { selectedHex } = useMap();

  if (!currentCivilization) return null;

  // Find unit at selected hex
  const unitAtHex = selectedHex ? 
    currentCivilization.units.find(unit => unit.x === selectedHex.x && unit.y === selectedHex.y) : 
    null;

  const displayUnit = unitAtHex || selectedUnit;

  const handleUnitSelect = (unitId: string) => {
    selectUnit(unitId);
  };

  const handleMoveToHex = () => {
    if (displayUnit && selectedHex && 
        (displayUnit.x !== selectedHex.x || displayUnit.y !== selectedHex.y)) {
      moveUnit(displayUnit.id, selectedHex.x, selectedHex.y);
    }
  };

  const handleAttack = () => {
    if (displayUnit && selectedHex) {
      attackWithUnit(displayUnit.id, selectedHex.x, selectedHex.y);
    }
  };

  const getUnitIcon = (type: string) => {
    switch (type) {
      case 'warrior': return '⚔️';
      case 'archer': return '🏹';
      case 'settler': return '🏕️';
      case 'scout': return '🔍';
      default: return '👤';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Units</h3>
      
      <div className="space-y-2">
        <Select value={selectedUnit?.id || ""} onValueChange={handleUnitSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Select a unit" />
          </SelectTrigger>
          <SelectContent>
            {currentCivilization.units.map(unit => (
              <SelectItem key={unit.id} value={unit.id}>
                {getUnitIcon(unit.type)} {unit.name} ({unit.x}, {unit.y})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {displayUnit && (
          <Card className="p-4 bg-gray-700">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-medium flex items-center space-x-2">
                  <span>{getUnitIcon(displayUnit.type)}</span>
                  <span>{displayUnit.name}</span>
                </h4>
                <div className="text-sm text-gray-300">
                  ({displayUnit.x}, {displayUnit.y})
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>💪 Strength: {displayUnit.strength}</div>
                <div>❤️ Health: {displayUnit.health}/{displayUnit.maxHealth}</div>
                <div>🚶 Movement: {displayUnit.movement}/{displayUnit.maxMovement}</div>
                <div>⭐ Experience: {displayUnit.experience}</div>
              </div>

              {displayUnit.abilities.length > 0 && (
                <div className="space-y-1">
                  <div className="text-sm font-medium">Abilities:</div>
                  <div className="text-xs space-y-1">
                    {displayUnit.abilities.map(ability => (
                      <div key={ability} className="bg-gray-600 p-1 rounded">
                        {ability}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={handleMoveToHex}
                  disabled={!selectedHex || displayUnit.movement <= 0}
                >
                  Move to Selected Hex
                </Button>
                
                <Button 
                  size="sm" 
                  className="w-full bg-red-600 hover:bg-red-700"
                  onClick={handleAttack}
                  disabled={!selectedHex || displayUnit.movement <= 0}
                >
                  Attack
                </Button>

                {displayUnit.type === 'settler' && (
                  <Button 
                    size="sm" 
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      // Handle city founding
                      console.log('Found city at', displayUnit.x, displayUnit.y);
                    }}
                  >
                    Found City
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
