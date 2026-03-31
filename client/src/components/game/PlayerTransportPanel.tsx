import { useState, useEffect, useCallback } from "react";
import { getPlayerTransport, type PlayerTransportDTO } from "../../lib/api/economyApi";

// ─── Matériaux ────────────────────────────────────────────────────────────

type MatKey = 'gold'|'food'|'wood'|'stone'|'iron'|'copper'|'coal'|'oil'|'herbs'|'fur';
const MAT_ROWS: Array<[MatKey, string, string]> = [
  ['gold','🪙','Or'],['food','🌿','Nourriture'],['wood','🪵','Bois'],
  ['stone','🪨','Pierre'],['iron','⚙️','Fer'],['copper','🟤','Cuivre'],
  ['coal','🖤','Charbon'],['oil','🛢️','Pétrole'],['herbs','🌱','Herbes'],
  ['fur','🦊','Fourrure'],
];

// ─── PlayerTransportPanel ────────────────────────────────────────────────

export function PlayerTransportPanel() {
  const [transport, setTransport] = useState<PlayerTransportDTO | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const loadTransport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPlayerTransport();
      setTransport(data);
    } catch (err: any) {
      setError(err.message ?? "Erreur chargement transport");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTransport(); }, [loadTransport]);

  useEffect(() => {
    const handler = () => loadTransport();
    window.addEventListener('nova:logistic-refresh', handler);
    return () => window.removeEventListener('nova:logistic-refresh', handler);
  }, [loadTransport]);

  const active = transport
    ? MAT_ROWS.filter(([k]) => (transport[k] ?? 0) > 0)
    : [];

  return (
    <div className="space-y-3">

      <div className="flex items-center justify-between">
        <h4 className="font-bold text-base text-amber-900">🎒 Inventaire de Transport</h4>
        <button
          onClick={loadTransport}
          disabled={loading}
          className="text-xs px-2 py-1 bg-amber-700 text-amber-50 rounded hover:bg-amber-600 disabled:opacity-50"
        >
          {loading ? "…" : "↻ Actualiser"}
        </button>
      </div>

      <p className="text-xs text-amber-500 italic">
        Ressources physiquement portées par le joueur · Alimenté depuis la banque.
      </p>

      {loading ? (
        <p className="text-xs text-amber-500">Chargement…</p>
      ) : error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : transport ? (
        <div className="bg-gradient-to-b from-amber-50 to-amber-100 border border-amber-300 rounded-lg p-3 space-y-2">

          {/* Jauge capacité */}
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-amber-700 font-medium">Capacité</span>
            <span className={[
              "font-bold",
              transport.usedUnits >= transport.maxUnits ? "text-red-600" : "text-green-700",
            ].join(" ")}>
              {transport.usedUnits} / {transport.maxUnits} unités · {transport.freeUnits} libres
            </span>
          </div>

          {/* Barre de capacité */}
          <div className="h-1.5 bg-amber-200 rounded-full overflow-hidden mb-2">
            <div
              className={[
                "h-full rounded-full transition-all",
                transport.usedUnits >= transport.maxUnits
                  ? "bg-red-500"
                  : transport.usedUnits > transport.maxUnits * 0.7
                    ? "bg-orange-400"
                    : "bg-green-500",
              ].join(" ")}
              style={{ width: `${Math.min(100, (transport.usedUnits / transport.maxUnits) * 100)}%` }}
            />
          </div>

          {/* Matériaux portés */}
          {active.length === 0 ? (
            <p className="text-xs text-amber-400 italic text-center py-2">Sac vide</p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {active.map(([k, icon, label]) => (
                <div key={k} className="bg-white border border-amber-200 rounded p-1.5 flex items-center gap-1.5">
                  <span>{icon}</span>
                  <div>
                    <div className="text-xs text-amber-500 leading-tight">{label}</div>
                    <div className="font-bold text-amber-900 text-sm leading-tight">
                      {(transport as any)[k]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {transport.usedUnits >= transport.maxUnits && (
            <p className="text-xs text-red-600 font-semibold text-center">⚠️ Sac plein</p>
          )}

          <p className="text-xs text-amber-400 italic pt-1 border-t border-amber-200">
            Capacité max : {transport.maxUnits} unités · Approvisionnez via la Banque.
          </p>
        </div>
      ) : null}
    </div>
  );
}
