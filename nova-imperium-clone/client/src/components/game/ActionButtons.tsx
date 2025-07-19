import { useReputation, REPUTATION_ACTIONS } from "../../lib/stores/useReputation";
import { useFactions } from "../../lib/stores/useFactions";

export function ActionButtons() {
  const { addReputationAction, canPerformAction } = useReputation();
  const { playerFaction } = useFactions();
  
  const handleAction = (actionType: keyof typeof REPUTATION_ACTIONS) => {
    const action = REPUTATION_ACTIONS[actionType];
    addReputationAction({
      ...action,
      witnesses: playerFaction ? [playerFaction] : []
    });
  };

  return (
    <div className="bg-gradient-to-b from-amber-200 via-amber-100 to-amber-200 border-2 border-amber-800 rounded-lg shadow-lg p-4 w-80">
      <div className="text-amber-900 font-bold text-lg mb-3 text-center">
        ACTIONS NOVA IMPERIUM
      </div>
      
      <div className="space-y-2">
        {/* Diplomatic Actions */}
        <div className="bg-amber-50 border border-amber-700 rounded p-3">
          <div className="text-amber-900 font-semibold mb-2">🤝 Diplomatique</div>
          <div className="space-y-1">
            <button
              onClick={() => handleAction('KEEP_PROMISE')}
              className="w-full px-3 py-1 bg-green-200 text-green-800 rounded text-sm hover:bg-green-300 transition-colors"
            >
              Tenir une promesse (+50)
            </button>
            <button
              onClick={() => handleAction('BREAK_PROMISE')}
              className="w-full px-3 py-1 bg-red-200 text-red-800 rounded text-sm hover:bg-red-300 transition-colors"
            >
              Rompre une promesse (-100)
            </button>
          </div>
        </div>
        
        {/* Military Actions */}
        <div className="bg-amber-50 border border-amber-700 rounded p-3">
          <div className="text-amber-900 font-semibold mb-2">⚔️ Militaire</div>
          <div className="space-y-1">
            <button
              onClick={() => handleAction('HELP_ALLY')}
              className="w-full px-3 py-1 bg-green-200 text-green-800 rounded text-sm hover:bg-green-300 transition-colors"
            >
              Aider un allié (+30)
            </button>
            <button
              onClick={() => handleAction('BETRAY_ALLY')}
              className="w-full px-3 py-1 bg-red-200 text-red-800 rounded text-sm hover:bg-red-300 transition-colors"
            >
              Trahir un allié (-200)
            </button>
          </div>
        </div>
        
        {/* Social Actions */}
        <div className="bg-amber-50 border border-amber-700 rounded p-3">
          <div className="text-amber-900 font-semibold mb-2">👥 Social</div>
          <div className="space-y-1">
            <button
              onClick={() => handleAction('PROTECT_INNOCENT')}
              className="w-full px-3 py-1 bg-green-200 text-green-800 rounded text-sm hover:bg-green-300 transition-colors"
            >
              Protéger un innocent (+75)
            </button>
            <button
              onClick={() => handleAction('ATTACK_INNOCENT')}
              className="w-full px-3 py-1 bg-red-200 text-red-800 rounded text-sm hover:bg-red-300 transition-colors"
            >
              Attaquer un innocent (-150)
            </button>
            <button
              onClick={() => handleAction('COMPLETE_QUEST')}
              className="w-full px-3 py-1 bg-blue-200 text-blue-800 rounded text-sm hover:bg-blue-300 transition-colors"
            >
              Terminer une quête (+25)
            </button>
          </div>
        </div>
        
        {/* Religious Actions */}
        <div className="bg-amber-50 border border-amber-700 rounded p-3">
          <div className="text-amber-900 font-semibold mb-2">⚡ Guilde de Pandem</div>
          <div className="space-y-1">
            <button
              onClick={() => handleAction('DONATE_TO_GUILD')}
              className="w-full px-3 py-1 bg-purple-200 text-purple-800 rounded text-sm hover:bg-purple-300 transition-colors"
            >
              Faire un don (+100)
            </button>
            <button
              onClick={() => handleAction('DEFY_GUILD')}
              className="w-full px-3 py-1 bg-red-200 text-red-800 rounded text-sm hover:bg-red-300 transition-colors"
            >
              Défier la Guilde (-300)
            </button>
          </div>
        </div>
        
        {/* Available Actions Based on Reputation */}
        <div className="bg-amber-50 border border-amber-700 rounded p-3">
          <div className="text-amber-900 font-semibold mb-2">🎯 Actions Spéciales</div>
          <div className="space-y-1">
            {canPerformAction('create_faction') && (
              <div className="text-green-600 text-sm">✓ Peut créer une faction</div>
            )}
            {canPerformAction('lead_expedition') && (
              <div className="text-green-600 text-sm">✓ Peut diriger une expédition</div>
            )}
            {canPerformAction('judge_dispute') && (
              <div className="text-green-600 text-sm">✓ Peut juger un conflit</div>
            )}
            {canPerformAction('sanctify_territory') && (
              <div className="text-green-600 text-sm">✓ Peut sanctifier un territoire</div>
            )}
            {canPerformAction('raid') && (
              <div className="text-red-600 text-sm">⚠ Peut piller</div>
            )}
            {canPerformAction('corrupt') && (
              <div className="text-red-600 text-sm">⚠ Peut corrompre</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}