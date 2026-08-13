import { useState, useEffect, useCallback } from "react";
import {
  getCityHarvest,
  postCollectHarvest,
  getCityWarehouseInfo,
  type CityHarvestDTO,
  type CityWarehouseInfoDTO,
} from "../../lib/api/economyApi";

// ─── Types ─────────────────────────────────────────────────────────────────

interface CityMeta {
  id:        number;
  name:      string;
  buildings: string[];
}

interface CityHarvestState {
  cityId:     number;
  data:       CityHarvestDTO | null;
  loading:    boolean;
  error:      string | null;
  collecting: boolean;
  message:    string | null;
}

interface Props {
  currentUser:       string;
  role?:             string | null;
  adminModeEnabled?: boolean;
}

// ─── Matériaux ────────────────────────────────────────────────────────────

type MatKey = 'fracten'|'common_metals'|'leather_fur'|'food'|'wood'|'stone'|'coal'|'oil'|'herbs'
            |'common_textiles'|'labor_contracts'|'basic_equipment'; // V3-D2
const MAT_ICONS: Array<[MatKey, string, string]> = [
  ['fracten','💎','Fracten'],['common_metals','⚒️','Métaux communs'],['leather_fur','🦺','Cuir & Fourrure'],
  ['food','🌿','Nourriture'],['wood','🪵','Bois'],
  ['stone','🪨','Pierre'],['coal','🖤','Charbon'],['oil','🛢️','Pétrole'],['herbs','🌱','Herbes'],
  // V3-D2
  ['common_textiles','🧶','Textiles communs'],['labor_contracts','📜','Contrats de travail'],['basic_equipment','🛡️','Équipement basique'],
];

function isMatsEmpty(m: Record<MatKey, number>): boolean {
  return MAT_ICONS.every(([k]) => (m[k] ?? 0) === 0);
}

function MatLine({ label, mats }: { label: string; mats: Record<MatKey, number> }) {
  const active = MAT_ICONS.filter(([k]) => (mats[k] ?? 0) > 0);
  return (
    <div className="text-xs text-amber-700">
      <span className="text-amber-500 font-medium mr-1">{label}</span>
      {active.length === 0
        ? <span className="text-amber-400 italic">—</span>
        : active.map(([k, icon]) => (
            <span key={k} className="mr-1.5">
              {icon} {mats[k]}
            </span>
          ))
      }
    </div>
  );
}

// ─── HarvestPanel ──────────────────────────────────────────────────────────

export function HarvestPanel({ currentUser, role, adminModeEnabled }: Props) {
  const [cities,     setCities]     = useState<CityMeta[]>([]);
  const [harvests,   setHarvests]   = useState<Record<number, CityHarvestState>>({});
  const [warehouses, setWarehouses] = useState<Record<number, CityWarehouseInfoDTO>>({});
  const [loading,    setLoading]    = useState(true);

  // ─── Chargement ─────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const saved = localStorage.getItem("nova_imperium_auth");
      const token = saved ? JSON.parse(saved).token : null;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch("/api/cities/me", { headers });
      if (!res.ok) throw new Error(`${res.status}`);
      const data: CityMeta[] = await res.json();
      setCities(data);

      const initial: Record<number, CityHarvestState> = {};
      for (const c of data) {
        initial[c.id] = { cityId: c.id, data: null, loading: true, error: null, collecting: false, message: null };
      }
      setHarvests(initial);

      // Chargement parallèle : harvest + warehouse par ville
      const [harvestResults, warehouseResults] = await Promise.all([
        Promise.allSettled(data.map(c => getCityHarvest(c.id))),
        Promise.allSettled(data.map(c => getCityWarehouseInfo(c.id))),
      ]);

      setHarvests(prev => {
        const next = { ...prev };
        data.forEach((c, i) => {
          const r = harvestResults[i];
          next[c.id] = r.status === "fulfilled"
            ? { ...next[c.id], data: r.value, loading: false, error: null }
            : { ...next[c.id], loading: false, error: (r.reason as Error)?.message ?? "Erreur" };
        });
        return next;
      });

      const whMap: Record<number, CityWarehouseInfoDTO> = {};
      data.forEach((c, i) => {
        const r = warehouseResults[i];
        if (r.status === "fulfilled") whMap[c.id] = r.value;
      });
      setWarehouses(whMap);

    } catch (err: any) {
      console.error("[HarvestPanel] loadAll:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const handler = () => loadAll();
    window.addEventListener('nova:logistic-refresh', handler);
    return () => window.removeEventListener('nova:logistic-refresh', handler);
  }, [loadAll]);

  // ─── Collecte ─────────────────────────────────────────────────────────
  const handleCollect = async (cityId: number) => {
    setHarvests(prev => ({ ...prev, [cityId]: { ...prev[cityId], collecting: true, message: null } }));
    try {
      const result = await postCollectHarvest(cityId, role ?? undefined, adminModeEnabled);
      const min = Math.ceil((result.action.msRemaining ?? 0) / 60000);
      const msg = adminModeEnabled
        ? "✅ Collecte immédiate (admin)"
        : `⏳ ${min} min restante${min > 1 ? 's' : ''}`;
      setHarvests(prev => ({ ...prev, [cityId]: { ...prev[cityId], collecting: false, message: msg } }));
      setTimeout(() => {
        getCityHarvest(cityId)
          .then(data => setHarvests(prev => ({ ...prev, [cityId]: { ...prev[cityId], data } })))
          .catch(() => {});
        window.dispatchEvent(new CustomEvent('nova:logistic-refresh'));
      }, adminModeEnabled ? 800 : 2000);
    } catch (err: any) {
      const msg = err.message?.startsWith("ACTION_ALREADY_ACTIVE")
        ? "⚠️ Action déjà en cours"
        : `❌ ${err.message ?? "Erreur"}`;
      setHarvests(prev => ({ ...prev, [cityId]: { ...prev[cityId], collecting: false, message: msg } }));
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">

      <div className="flex items-center justify-between">
        <h4 className="font-bold text-base text-amber-900">🌾 Inventaires des Villes</h4>
        <button
          onClick={loadAll}
          disabled={loading}
          className="text-xs px-2 py-1 bg-amber-700 text-amber-50 rounded hover:bg-amber-600 disabled:opacity-50"
        >
          {loading ? "…" : "↻ Actualiser"}
        </button>
      </div>

      <p className="text-xs text-amber-500 italic">
        Stock local de chaque ville · Villes sans banque : collectez la production en attente.
      </p>

      {loading && cities.length === 0 ? (
        <p className="text-xs text-amber-500">Chargement…</p>
      ) : cities.length === 0 ? (
        <p className="text-xs text-amber-400 italic">Aucune ville dans votre faction.</p>
      ) : (
        <div className="space-y-2.5">
          {cities.map(city => {
            const h = harvests[city.id];
            const wh = warehouses[city.id];
            const hasBank = city.buildings?.includes('bank') ?? false;
            return (
              <div key={city.id} className="bg-white border border-amber-200 rounded p-2.5">
                {/* En-tête ville */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-amber-900 text-sm">{city.name}</span>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {hasBank
                      ? <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs">🏦 banque</span>
                      : <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-xs">🌾 collecte</span>
                    }
                    {wh ? (
                      wh.hasWarehouse
                        ? <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded text-xs" title={`Capacité ${wh.capacity} unités`}>
                            🏪 Niv.{wh.level} — {wh.currentTotal}/{wh.capacity}
                          </span>
                        : <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-xs">⚠️ pas d'entrepôt</span>
                    ) : null}
                  </div>
                </div>

                {h?.loading && <p className="text-amber-400 text-xs">Chargement…</p>}
                {h?.error   && <p className="text-red-400 text-xs">{h.error}</p>}

                {h && !h.loading && !h.error && h.data && (
                  <div className="space-y-1">
                    {/* Pending (villes sans banque uniquement) */}
                    {!hasBank && (
                      <MatLine
                        label="⏳ En attente :"
                        mats={h.data.pending as Record<MatKey, number>}
                      />
                    )}
                    {/* Stock local */}
                    <MatLine
                      label="📦 Stock local :"
                      mats={h.data.inventory as Record<MatKey, number>}
                    />

                    {/* Bouton collecte (villes sans banque + pending non vide) */}
                    {!hasBank && (
                      <button
                        onClick={() => handleCollect(city.id)}
                        disabled={h.collecting || isMatsEmpty(h.data!.pending as Record<MatKey, number>)}
                        className={[
                          "mt-1 px-2 py-0.5 rounded text-xs font-semibold transition",
                          h.collecting || isMatsEmpty(h.data!.pending as Record<MatKey, number>)
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-amber-500 hover:bg-amber-600 text-white",
                        ].join(" ")}
                      >
                        {h.collecting ? "⏳…" : "🚜 Collecter"}
                      </button>
                    )}

                    {h.message && (
                      <p className="text-xs font-medium text-amber-700 mt-0.5">{h.message}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
