import { useState, useEffect, useCallback } from "react";
import { useNovaImperium } from "../../lib/stores/useNovaImperium";
import { fetchMyEconomy, type EconomyDTO } from "../../lib/api/economyApi";

export function TreasuryPanel() {
  const { currentNovaImperium } = useNovaImperium();
  const [economy, setEconomy] = useState<EconomyDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEconomy = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchMyEconomy()
      .then(data => { setEconomy(data); setLoading(false); })
      .catch(() => { setError("Impossible de charger l'économie"); setLoading(false); });
  }, []);

  useEffect(() => { loadEconomy(); }, [loadEconomy]);

  if (!currentNovaImperium) {
    return (
      <div className="text-center p-4">
        <div className="text-amber-900 font-bold mb-2">Chargement des données...</div>
        <div className="text-sm text-amber-700">Initialisation en cours...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center p-4">
        <div className="text-amber-900 font-bold mb-2">Chargement de l'économie...</div>
      </div>
    );
  }

  if (error || !economy) {
    return (
      <div className="text-center p-4">
        <div className="text-red-800 font-bold mb-2">{error ?? "Erreur inconnue"}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-base text-amber-900">Trésorerie</h4>
        <button
          onClick={loadEconomy}
          disabled={loading}
          className="text-xs px-2 py-1 bg-amber-700 text-amber-50 rounded hover:bg-amber-600 disabled:opacity-50"
        >
          {loading ? "..." : "↻"}
        </button>
      </div>

      {/* Réserves de faction (source : serveur) */}
      <div className="bg-gradient-to-b from-amber-200 to-amber-300 border-2 border-amber-800 rounded-lg p-4">
        <div className="text-center mb-3">
          <h5 className="font-bold text-amber-900">Réserves de Faction</h5>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-amber-50 border border-amber-700 rounded p-2">
            <div className="text-center">
              <div className="text-xl mb-1">💰</div>
              <div className="text-xs font-medium">Or</div>
              <div className="text-sm font-bold text-amber-900">{economy.gold}</div>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-700 rounded p-2">
            <div className="text-center">
              <div className="text-xl mb-1">🌾</div>
              <div className="text-xs font-medium">Nourriture</div>
              <div className="text-sm font-bold text-amber-900">{economy.food}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenus par tour (source : serveur) */}
      <div className="bg-gradient-to-b from-green-200 to-green-300 border-2 border-green-800 rounded-lg p-4">
        <div className="text-center mb-3">
          <h5 className="font-bold text-green-900">Revenus par Tour</h5>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-green-50 border border-green-700 rounded p-2">
            <div className="flex justify-between">
              <span>🌾 Nourriture</span>
              <span className="font-bold text-green-900">+{economy.foodPerTurn}</span>
            </div>
          </div>
          <div className="bg-green-50 border border-green-700 rounded p-2">
            <div className="flex justify-between">
              <span>💰 Or</span>
              <span className="font-bold text-green-900">+{economy.goldPerTurn}</span>
            </div>
          </div>
        </div>
        <div className="mt-2 text-center text-xs text-green-700">
          Tour traité : {economy.lastProcessedTurn}
        </div>
      </div>

      {/* Détail par ville (source : store — villes du serveur) */}
      <div className="bg-gradient-to-b from-amber-200 to-amber-300 border-2 border-amber-800 rounded-lg p-4">
        <div className="text-center mb-3">
          <h5 className="font-bold text-amber-900">Détail par Ville</h5>
        </div>
        <div className="space-y-3">
          {currentNovaImperium.cities.map(city => (
            <div key={city.id} className="bg-amber-50 border border-amber-700 rounded p-3">
              <div className="font-bold text-center mb-2 text-amber-900">{city.name}</div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Population : {city.population}</span>
                  <span>🏛️ Bâtiments : {city.buildings.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>🌾 +{city.foodPerTurn}</span>
                  <span>🔨 +{city.productionPerTurn}</span>
                </div>
                <div className="text-xs text-amber-700 mt-1">
                  {city.buildings.join(', ') || 'Aucun bâtiment'}
                </div>
              </div>
            </div>
          ))}
          {currentNovaImperium.cities.length === 0 && (
            <div className="text-center text-xs text-amber-700">Aucune ville</div>
          )}
        </div>
      </div>
    </div>
  );
}
