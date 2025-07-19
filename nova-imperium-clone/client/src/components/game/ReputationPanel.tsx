import { useReputation } from "../../lib/stores/useReputation";

export function ReputationPanel() {
  const { honor, reputation, reputationHistory, getReputationLevel } = useReputation();
  
  const level = getReputationLevel();
  const progressToNext = level.maxHonor < 2000 ? 
    ((honor - level.minHonor) / (level.maxHonor - level.minHonor)) * 100 : 100;

  return (
    <div className="bg-gradient-to-b from-amber-200 via-amber-100 to-amber-200 border-2 border-amber-800 rounded-lg shadow-lg p-4 w-80">
      <div className="text-amber-900 font-bold text-lg mb-3 text-center">
        RÉPUTATION
      </div>
      
      {/* Current Reputation Level */}
      <div className="bg-amber-50 border border-amber-700 rounded p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-amber-900 font-semibold">{level.name}</span>
          <span 
            className="px-2 py-1 rounded text-white text-sm font-bold"
            style={{ backgroundColor: level.color }}
          >
            {honor}
          </span>
        </div>
        
        <div className="text-amber-700 text-sm mb-2">
          {level.description}
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-amber-200 rounded-full h-2 mb-2">
          <div 
            className="h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${progressToNext}%`,
              backgroundColor: level.color
            }}
          />
        </div>
        
        <div className="text-amber-600 text-xs text-center">
          {level.maxHonor < 2000 ? 
            `${level.maxHonor - honor} points jusqu'au prochain niveau` :
            "Niveau maximum atteint"
          }
        </div>
      </div>
      
      {/* Effects */}
      <div className="bg-amber-50 border border-amber-700 rounded p-3 mb-3">
        <div className="text-amber-900 font-semibold mb-2">🎭 Effets</div>
        <div className="space-y-1">
          {level.effects.map((effect, index) => (
            <div key={index} className="text-amber-700 text-sm">
              • {effect}
            </div>
          ))}
        </div>
      </div>
      
      {/* Recent Actions */}
      <div className="bg-amber-50 border border-amber-700 rounded p-3">
        <div className="text-amber-900 font-semibold mb-2">📜 Actions Récentes</div>
        <div className="max-h-32 overflow-y-auto space-y-2">
          {reputationHistory.slice(-5).reverse().map((action, index) => (
            <div key={action.id} className="text-xs">
              <div className="flex justify-between items-center">
                <span className="text-amber-700">{action.description}</span>
                <span className={`font-semibold ${action.honorChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {action.honorChange >= 0 ? '+' : ''}{action.honorChange}
                </span>
              </div>
              <div className="text-amber-500 text-xs">
                {new Date(action.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
          {reputationHistory.length === 0 && (
            <div className="text-amber-600 text-sm italic">
              Aucune action enregistrée
            </div>
          )}
        </div>
      </div>
    </div>
  );
}