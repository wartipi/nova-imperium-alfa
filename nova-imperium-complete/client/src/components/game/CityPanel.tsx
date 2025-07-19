import { useState } from "react";
import { useCivilizations } from "../../lib/stores/useCivilizations";
import { useMap } from "../../lib/stores/useMap";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Progress } from "../ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { City, BuildingType, UnitType } from "../../lib/game/types";

export function CityPanel() {
  const { currentCivilization, selectedCity, selectCity, buildInCity, trainUnit } = useCivilizations();
  const { selectedHex } = useMap();
  const [selectedCityId, setSelectedCityId] = useState<string>("");

  if (!currentCivilization) return null;

  // Find city at selected hex
  const cityAtHex = selectedHex ? 
    currentCivilization.cities.find(city => city.x === selectedHex.x && city.y === selectedHex.y) : 
    null;

  const displayCity = cityAtHex || selectedCity;

  const handleCitySelect = (cityId: string) => {
    setSelectedCityId(cityId);
    selectCity(cityId);
  };

  const handleBuildBuilding = (buildingType: BuildingType) => {
    if (displayCity) {
      buildInCity(displayCity.id, buildingType);
    }
  };

  const handleTrainUnit = (unitType: UnitType) => {
    if (displayCity) {
      trainUnit(displayCity.id, unitType);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Select value={selectedCityId} onValueChange={handleCitySelect}>
          <SelectTrigger>
            <SelectValue placeholder="Select a city" />
          </SelectTrigger>
          <SelectContent>
            {currentCivilization.cities.map(city => (
              <SelectItem key={city.id} value={city.id}>
                {city.name} (Pop: {city.population})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {displayCity && (
        <Card className="p-4 bg-gray-700">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{displayCity.name}</h3>
              <div className="text-sm text-gray-300">
                Pop: {displayCity.population}/{displayCity.populationCap}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>🌾 Food: {displayCity.foodPerTurn}</div>
              <div>🔨 Production: {displayCity.productionPerTurn}</div>
              <div>🔬 Science: {displayCity.sciencePerTurn}</div>
              <div>🎭 Culture: {displayCity.culturePerTurn}</div>
            </div>

            {displayCity.currentProduction && (
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  Building: {displayCity.currentProduction.name}
                </div>
                <Progress 
                  value={(displayCity.productionProgress / displayCity.currentProduction.cost) * 100} 
                  className="h-2" 
                />
                <div className="text-xs text-gray-400">
                  {displayCity.productionProgress}/{displayCity.currentProduction.cost} 
                  ({Math.ceil((displayCity.currentProduction.cost - displayCity.productionProgress) / displayCity.productionPerTurn)} turns)
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="font-medium">Buildings</h4>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {displayCity.buildings.map(building => (
                  <div key={building} className="bg-gray-600 p-1 rounded">
                    {building}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Build Queue</h4>
              <div className="space-y-1">
                <Button 
                  size="sm" 
                  className="w-full justify-start" 
                  onClick={() => handleBuildBuilding("granary")}
                >
                  Granary (60 🔨)
                </Button>
                <Button 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => handleBuildBuilding("library")}
                >
                  Library (90 🔨)
                </Button>
                <Button 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => handleBuildBuilding("barracks")}
                >
                  Barracks (80 🔨)
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Train Units</h4>
              <div className="space-y-1">
                <Button 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => handleTrainUnit("warrior")}
                >
                  Warrior (40 🔨)
                </Button>
                <Button 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => handleTrainUnit("archer")}
                >
                  Archer (50 🔨)
                </Button>
                <Button 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => handleTrainUnit("settler")}
                >
                  Settler (100 🔨)
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
