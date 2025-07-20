import { useState } from "react";
import { useCivilizations } from "../../lib/stores/useCivilizations";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { Civilization, DiplomaticRelation } from "../../lib/game/types";

export function DiplomacyPanel() {
  const { civilizations, currentCivilization, sendDiplomaticProposal } = useCivilizations();
  const [selectedCivId, setSelectedCivId] = useState<string>("");

  if (!currentCivilization) return null;

  const otherCivilizations = civilizations.filter(civ => 
    civ.id !== currentCivilization.id && !civ.isDefeated
  );

  const selectedCiv = otherCivilizations.find(civ => civ.id === selectedCivId);
  const relation = selectedCiv ? 
    currentCivilization.diplomacy.find(d => d.civilizationId === selectedCiv.id) : 
    null;

  const getRelationColor = (relation: DiplomaticRelation) => {
    switch (relation.status) {
      case 'war': return 'text-red-400';
      case 'peace': return 'text-green-400';
      case 'alliance': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const handleProposal = (type: 'peace' | 'alliance' | 'trade' | 'war') => {
    if (selectedCiv) {
      sendDiplomaticProposal(selectedCiv.id, type);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Diplomacy</h3>
      
      <div className="space-y-2">
        <h4 className="font-medium">Relations Overview</h4>
        <div className="space-y-1">
          {currentCivilization.diplomacy.map(relation => {
            const civ = civilizations.find(c => c.id === relation.civilizationId);
            if (!civ) return null;
            
            return (
              <div 
                key={relation.civilizationId} 
                className="flex justify-between items-center p-2 bg-gray-700 rounded"
              >
                <span className="text-sm">{civ.name}</span>
                <span className={`text-xs ${getRelationColor(relation)}`}>
                  {relation.status.toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Diplomatic Actions</h4>
        <Select value={selectedCivId} onValueChange={setSelectedCivId}>
          <SelectTrigger>
            <SelectValue placeholder="Select civilization" />
          </SelectTrigger>
          <SelectContent>
            {otherCivilizations.map(civ => (
              <SelectItem key={civ.id} value={civ.id}>
                {civ.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedCiv && relation && (
          <Card className="p-4 bg-gray-700">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h5 className="font-medium">{selectedCiv.name}</h5>
                <span className={`text-sm ${getRelationColor(relation)}`}>
                  {relation.status.toUpperCase()}
                </span>
              </div>

              <div className="text-sm space-y-1">
                <div>Trust: {relation.trust}</div>
                <div>Trade: {relation.tradeAgreement ? 'Active' : 'None'}</div>
                <div>Military: {relation.militaryAccess ? 'Granted' : 'Denied'}</div>
              </div>

              <div className="space-y-1">
                {relation.status === 'war' && (
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleProposal('peace')}
                  >
                    Propose Peace
                  </Button>
                )}
                
                {relation.status === 'peace' && (
                  <>
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleProposal('alliance')}
                    >
                      Propose Alliance
                    </Button>
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleProposal('trade')}
                    >
                      Propose Trade
                    </Button>
                  </>
                )}

                {relation.status !== 'war' && (
                  <Button 
                    size="sm" 
                    className="w-full bg-red-600 hover:bg-red-700"
                    onClick={() => handleProposal('war')}
                  >
                    Declare War
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
