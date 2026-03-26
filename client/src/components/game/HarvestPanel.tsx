import { useState, useEffect, useCallback } from "react";
import {
  getPlayerBank,
  getCityHarvest,
  postCollectHarvest,
  type PlayerBankDTO,
  type CityHarvestDTO,
} from "../../lib/api/economyApi";
import { fetchMyEconomy } from "../../lib/api/economyApi";

// ─── Types ─────────────────────────────────────────────────────────────────

interface CityHarvestState {
  cityId:  number;
  data:    CityHarvestDTO | null;
  loading: boolean;
  error:   string | null;
  collecting: boolean;
  message:    string | null;
}

interface Props {
  currentUser:      string;
  role?:            string | null;
  adminModeEnabled?: boolean;
}

// ─── HarvestPanel ──────────────────────────────────────────────────────────

export function HarvestPanel({ currentUser, role, adminModeEnabled }: Props) {
  const [bank, setBank]         = useState<PlayerBankDTO | null>(null);
  const [bankLoading, setBankLoading] = useState(true);
  const [bankError,   setBankError]   = useState<string | null>(null);

  const [cities, setCities]       = useState<number[]>([]);
  const [harvests, setHarvests]   = useState<Record<number, CityHarvestState>>({});
  const [citiesLoading, setCitiesLoading] = useState(true);

  // ─── Chargement banque joueur ────────────────────────────────────────────
  const loadBank = useCallback(() => {
    setBankLoading(true);
    setBankError(null);
    getPlayerBank()
      .then(b => { setBank(b); setBankLoading(false); })
      .catch(err => { setBankError(err.message ?? "Erreur banque"); setBankLoading(false); });
  }, []);

  // ─── Chargement villes depuis /api/cities/me ─────────────────────────────
  const loadCities = useCallback(async () => {
    setCitiesLoading(true);
    try {
      const saved = localStorage.getItem("nova_imperium_auth");
      const token = saved ? JSON.parse(saved).token : null;
      const headers: Record<string, string> = token
        ? { Authorization: `Bearer ${token}` }
        : {};
      const res = await fetch("/api/cities/me", { headers });
      if (!res.ok) throw new Error(`${res.status}`);
      const data: Array<{ id: number }> = await res.json();
      const ids = data.map(c => c.id);
      setCities(ids);

      const initial: Record<number, CityHarvestState> = {};
      for (const id of ids) initial[id] = { cityId: id, data: null, loading: true, error: null, collecting: false, message: null };
      setHarvests(initial);

      // Chargement en parallèle des harvest de chaque ville
      const results = await Promise.allSettled(ids.map(id => getCityHarvest(id)));
      setHarvests(prev => {
        const next = { ...prev };
        ids.forEach((id, i) => {
          const r = results[i];
          if (r.status === "fulfilled") {
            next[id] = { ...next[id], data: r.value, loading: false, error: null };
          } else {
            next[id] = { ...next[id], loading: false, error: (r.reason as Error)?.message ?? "Erreur" };
          }
        });
        return next;
      });
    } catch (err: any) {
      console.error("[HarvestPanel] loadCities:", err);
    } finally {
      setCitiesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBank();
    loadCities();
  }, [loadBank, loadCities]);

  // ─── Collecte physique ────────────────────────────────────────────────────
  const handleCollect = async (cityId: number) => {
    setHarvests(prev => ({ ...prev, [cityId]: { ...prev[cityId], collecting: true, message: null } }));
    try {
      const result = await postCollectHarvest(cityId, role ?? undefined, adminModeEnabled);
      const min = Math.ceil((result.action.msRemaining ?? 0) / 60000);
      const msg = adminModeEnabled
        ? "✅ Collecte immédiate (mode admin)"
        : `⏳ Collecte en cours — ${min} min restante${min > 1 ? 's' : ''}`;
      setHarvests(prev => ({ ...prev, [cityId]: { ...prev[cityId], collecting: false, message: msg } }));
      // Rafraîchit les données de la ville après un court délai
      setTimeout(() => {
        getCityHarvest(cityId)
          .then(data => setHarvests(prev => ({ ...prev, [cityId]: { ...prev[cityId], data } })))
          .catch(() => {});
        loadBank();
      }, adminModeEnabled ? 800 : 2000);
    } catch (err: any) {
      const msg = err.message?.startsWith("ACTION_ALREADY_ACTIVE")
        ? "⚠️ Une action est déjà en cours"
        : `❌ ${err.message ?? "Erreur de collecte"}`;
      setHarvests(prev => ({ ...prev, [cityId]: { ...prev[cityId], collecting: false, message: msg } }));
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-amber-900 border-b border-amber-300 pb-1">
        🌾 Récolte des Villes
      </h2>

      {/* ── Banque du joueur ─────────────────────────────────────────────── */}
      <div className="bg-amber-50 border border-amber-200 rounded p-3">
        <h3 className="font-semibold text-amber-800 mb-2">🏦 Banque personnelle</h3>
        {bankLoading ? (
          <p className="text-sm text-amber-600">Chargement…</p>
        ) : bankError ? (
          <p className="text-sm text-red-600">{bankError}</p>
        ) : bank ? (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-yellow-600 font-bold">🪙</span>
              <span className="text-amber-900">{bank.gold} or accumulé</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-green-600 font-bold">🌿</span>
              <span className="text-amber-900">{bank.food} nourriture accumulée</span>
            </div>
            <div className="col-span-2 text-xs text-amber-500">
              Dernier tick : tour {bank.lastProductionTurn}
            </div>
          </div>
        ) : (
          <p className="text-sm text-amber-600">Aucune donnée banque.</p>
        )}
      </div>

      {/* ── Harvest par ville ────────────────────────────────────────────── */}
      <div>
        <h3 className="font-semibold text-amber-800 mb-2">
          🏘️ Récolte par ville ({cities.length})
        </h3>

        {citiesLoading ? (
          <p className="text-sm text-amber-600">Chargement des villes…</p>
        ) : cities.length === 0 ? (
          <p className="text-sm text-amber-700">Aucune ville rattachée à votre faction.</p>
        ) : (
          <div className="space-y-3">
            {cities.map(cityId => {
              const h = harvests[cityId];
              if (!h) return null;

              return (
                <div key={cityId} className="bg-white border border-amber-200 rounded p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-amber-800">Ville #{cityId}</span>
                    {h.data?.hasBank && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        🏦 Banque — versement auto
                      </span>
                    )}
                  </div>

                  {h.loading ? (
                    <p className="text-amber-500 text-xs">Chargement…</p>
                  ) : h.error ? (
                    <p className="text-red-500 text-xs">{h.error}</p>
                  ) : h.data ? (
                    <>
                      {/* En attente */}
                      <div className="grid grid-cols-2 gap-1 mb-2">
                        <div className="text-amber-700">
                          ⏳ En attente :
                          <span className="ml-1 font-mono">
                            {h.data.pending.gold}🪙 {h.data.pending.food}🌿
                          </span>
                        </div>
                        <div className="text-amber-700">
                          📦 Inventaire :
                          <span className="ml-1 font-mono">
                            {h.data.inventory.gold}🪙 {h.data.inventory.food}🌿
                          </span>
                        </div>
                      </div>

                      {/* Bouton collecte (ville sans banque uniquement) */}
                      {!h.data.hasBank && (
                        <div className="mt-1">
                          <button
                            onClick={() => handleCollect(cityId)}
                            disabled={h.collecting || (h.data.pending.gold === 0 && h.data.pending.food === 0)}
                            className={[
                              "px-3 py-1 rounded text-xs font-semibold transition",
                              h.collecting
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : (h.data.pending.gold === 0 && h.data.pending.food === 0)
                                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                  : "bg-amber-500 hover:bg-amber-600 text-white cursor-pointer",
                            ].join(" ")}
                          >
                            {h.collecting ? "⏳ En cours…" : "🚜 Collecter la récolte"}
                          </button>
                        </div>
                      )}

                      {/* Message retour */}
                      {h.message && (
                        <p className="mt-1 text-xs text-amber-700 font-medium">{h.message}</p>
                      )}
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Rafraîchir ───────────────────────────────────────────────────── */}
      <div className="text-right">
        <button
          onClick={() => { loadBank(); loadCities(); }}
          className="text-xs text-amber-600 hover:text-amber-800 underline"
        >
          ↻ Actualiser
        </button>
      </div>
    </div>
  );
}
