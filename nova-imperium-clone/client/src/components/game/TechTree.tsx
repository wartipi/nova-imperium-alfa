import { useCivilizations } from "../../lib/stores/useCivilizations";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Progress } from "../ui/progress";
import { getTechTree, type Technology } from "../../lib/game/Technology";

export function TechTree() {
  const { currentCivilization, researchTechnology } = useCivilizations();

  if (!currentCivilization) return null;

  const techTree = getTechTree();
  const currentTech = currentCivilization.currentResearch;

  const canResearch = (tech: Technology): boolean => {
    if (currentCivilization.researchedTechnologies.includes(tech.id)) return false;
    if (currentTech && currentTech.id === tech.id) return false;
    return tech.prerequisites.every(prereq => 
      currentCivilization.researchedTechnologies.includes(prereq)
    );
  };

  const handleResearch = (techId: string) => {
    researchTechnology(techId);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Technology Tree</h3>
      
      {currentTech && (
        <Card className="p-4 bg-gray-700">
          <div className="space-y-2">
            <h4 className="font-medium">Current Research: {currentTech.name}</h4>
            <Progress 
              value={(currentCivilization.researchProgress / currentTech.cost) * 100} 
              className="h-2"
            />
            <div className="text-xs text-gray-400">
              {currentCivilization.researchProgress}/{currentTech.cost} 
              ({Math.ceil((currentTech.cost - currentCivilization.researchProgress) / currentCivilization.resources.science)} turns)
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {Object.entries(techTree).map(([era, technologies]) => (
          <div key={era} className="space-y-2">
            <h4 className="font-medium text-sm text-gray-300 uppercase">{era}</h4>
            <div className="space-y-1">
              {technologies.map(tech => {
                const isResearched = currentCivilization.researchedTechnologies.includes(tech.id);
                const isCurrentlyResearching = currentTech?.id === tech.id;
                const canRes = canResearch(tech);

                return (
                  <Card 
                    key={tech.id} 
                    className={`p-3 ${
                      isResearched ? 'bg-green-700' : 
                      isCurrentlyResearching ? 'bg-blue-700' : 
                      canRes ? 'bg-gray-600' : 'bg-gray-800'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{tech.name}</div>
                        <div className="text-xs text-gray-300 mt-1">{tech.description}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          Cost: {tech.cost} 🔬
                        </div>
                        {tech.prerequisites.length > 0 && (
                          <div className="text-xs text-gray-400 mt-1">
                            Requires: {tech.prerequisites.join(', ')}
                          </div>
                        )}
                      </div>
                      {!isResearched && !isCurrentlyResearching && canRes && (
                        <Button 
                          size="sm" 
                          onClick={() => handleResearch(tech.id)}
                          className="ml-2"
                        >
                          Research
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
