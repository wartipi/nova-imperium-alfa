import { useState, useEffect, useCallback } from "react";
import {
  getPlayerTransport,
  getPlayerCurrentCity,
  postDepositTransportToCity,
  type PlayerTransportDTO,
  type PlayerCurrentCityDTO,
  type T1Mats,
} from "../../lib/api/economyApi";

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
  const [transport,    setTransport]    = useState<PlayerTransportDTO | null>(null);
  const [currentCity,  setCurrentCity]  = useState<PlayerCurrentCityDTO | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  // Formulaire dépôt
  const [depositQty,   setDepositQty]   = useState<Partial<Record<MatKey, number>>>({});
  const [depositing,   setDepositing]   = useState(false);
  const [depositMsg,   setDepositMsg]   = useState<string | null>(null);

  // ─── Chargement ────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, c] = await Promise.all([getPlayerTransport(), getPlayerCurrentCity()]);
      setTransport(t);
      setCurrentCity(c);
    } catch (err: any) {
      setError(err.message ?? "Erreur chargement transport");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const h = () => { loadAll(); };
    window.addEventListener('nova:logistic-refresh', h);
    return () => window.removeEventListener('nova:logistic-refresh', h);
  }, [loadAll]);

  // Réinitialise les quantités du formulaire quand la ville change
  useEffect(() => {
    setDepositQty({});
    setDepositMsg(null);
  }, [currentCity?.cityId]);

  // ─── Dépôt ─────────────────────────────────────────────────────────────
  const handleDeposit = async () => {
    if (!currentCity?.cityId) return;
    const mats: T1Mats = {};
    let total = 0;
    for (const [k] of MAT_ROWS) {
      const v = depositQty[k] ?? 0;
      if (v > 0) { (mats as any)[k] = v; total += v; }
    }
    if (total === 0) {
      setDepositMsg("⚠️ Saisissez au moins une quantité > 0");
      return;
    }
    setDepositing(true);
    setDepositMsg(null);
    try {
      const result = await postDepositTransportToCity(mats);
      const parts = MAT_ROWS
        .filter(([k]) => (result.deposited as any)[k] > 0)
        .map(([k, icon]) => `${icon}${(result.deposited as any)[k]}`);
      setDepositMsg(`✅ Déposé dans ${result.cityName} : ${parts.join(" ")}`);
      setDepositQty({});
      // Rafraîchit transport + inventaire ville via bus d'événements
      window.dispatchEvent(new CustomEvent('nova:logistic-refresh'));
    } catch (err: any) {
      setDepositMsg(`❌ ${err.message ?? "Erreur de dépôt"}`);
    } finally {
      setDepositing(false);
    }
  };

  // ─── Helpers ───────────────────────────────────────────────────────────
  const active = transport
    ? MAT_ROWS.filter(([k]) => (transport[k] ?? 0) > 0)
    : [];

  const onQtyChange = (key: MatKey, raw: string) => {
    const v = parseInt(raw, 10);
    setDepositQty(prev => ({ ...prev, [key]: isNaN(v) || v < 0 ? 0 : v }));
  };

  const maxQty = (key: MatKey) =>
    Math.max(0, (transport?.[key] ?? 0));

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-base text-amber-900">🎒 Inventaire de Transport</h4>
        <button
          onClick={loadAll}
          disabled={loading}
          className="text-xs px-2 py-1 bg-amber-700 text-amber-50 rounded hover:bg-amber-600 disabled:opacity-50"
        >
          {loading ? "…" : "↻ Actualiser"}
        </button>
      </div>

      <p className="text-xs text-amber-500 italic">
        Ressources physiquement portées · Approvisionnez via la Banque.
      </p>

      {loading ? (
        <p className="text-xs text-amber-500">Chargement…</p>
      ) : error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : transport ? (
        <>
          {/* ── Inventaire courant ─────────────────────────────────────── */}
          <div className="bg-gradient-to-b from-amber-50 to-amber-100 border border-amber-300 rounded-lg p-3 space-y-2">
            {/* Jauge capacité */}
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-amber-700 font-medium">Capacité</span>
              <span className={[
                "font-bold",
                transport.usedUnits >= transport.maxUnits ? "text-red-600" : "text-green-700",
              ].join(" ")}>
                {transport.usedUnits} / {transport.maxUnits} · {transport.freeUnits} libres
              </span>
            </div>
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

            {/* Matériaux */}
            {active.length === 0 ? (
              <p className="text-xs text-amber-400 italic text-center py-1">Sac vide</p>
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
          </div>

          {/* ── Section dépôt ──────────────────────────────────────────── */}
          <div className="border border-amber-200 rounded-lg p-3 bg-white space-y-2">
            <h5 className="text-sm font-semibold text-amber-900">📥 Déposer dans la ville actuelle</h5>

            {/* Ville courante */}
            {currentCity?.cityId ? (
              <p className="text-xs text-green-700 font-medium">
                📍 Vous êtes à : <span className="font-bold">{currentCity.cityName}</span>
              </p>
            ) : (
              <p className="text-xs text-amber-500 italic">
                {currentCity?.reason ?? "Rendez-vous sur une ville pour déposer des ressources."}
              </p>
            )}

            {/* Formulaire — uniquement si sur une ville ET transport non vide */}
            {currentCity?.cityId && active.length > 0 && (
              <>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  {active.map(([k, icon, label]) => (
                    <div key={k} className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded p-1">
                      <span className="text-sm">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-amber-500 truncate">{label}</div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={maxQty(k)}
                            value={depositQty[k] ?? 0}
                            onChange={e => onQtyChange(k, e.target.value)}
                            className="w-14 text-xs border border-amber-300 rounded px-1 py-0.5 text-amber-900 bg-white"
                          />
                          <span className="text-xs text-amber-400">/ {maxQty(k)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleDeposit}
                  disabled={depositing}
                  className={[
                    "w-full mt-1 py-1 rounded text-xs font-bold transition",
                    depositing
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-amber-600 hover:bg-amber-700 text-white",
                  ].join(" ")}
                >
                  {depositing ? "⏳ Dépôt…" : "📥 Déposer dans la ville"}
                </button>
              </>
            )}

            {/* Sac vide + sur ville */}
            {currentCity?.cityId && active.length === 0 && (
              <p className="text-xs text-amber-400 italic">Sac vide — rien à déposer.</p>
            )}

            {depositMsg && (
              <p className="text-xs font-medium mt-1 text-amber-800">{depositMsg}</p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
