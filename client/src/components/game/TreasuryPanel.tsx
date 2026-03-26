import { useState, useEffect, useCallback } from "react";
import { Package, Sparkles, Scroll, Shield, Gem, Sword, Eye } from "lucide-react";
import {
  fetchMyEconomy,
  getPlayerBank,
  getCityHarvest,
  postCollectHarvest,
  type EconomyDTO,
  type PlayerBankDTO,
  type CityHarvestDTO,
} from "../../lib/api/economyApi";

// ─── Types ─────────────────────────────────────────────────────────────────

interface CityFull {
  id:             number;
  name:           string;
  population:     number;
  buildings:      string[];
  goldPerTurn:    number;
  foodPerTurn:    number;
  productionPerTurn?: number;
}

interface CityHarvestState {
  data:       CityHarvestDTO | null;
  loading:    boolean;
  error:      string | null;
  collecting: boolean;
  message:    string | null;
}

interface UniqueItem {
  id:          string;
  name:        string;
  type:        string;
  rarity:      string;
  description: string;
  value:       number;
  tradeable:   boolean;
}

interface Props {
  currentUser?:     string;
  role?:            string | null;
  adminModeEnabled?: boolean;
}

// ─── Helpers auth ────────────────────────────────────────────────────────────

function getAuthHeaders(): Record<string, string> {
  const saved = localStorage.getItem("nova_imperium_auth");
  if (!saved) return {};
  const { token } = JSON.parse(saved);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Bâtiment — emoji pour affichage ─────────────────────────────────────────

const BUILDING_LABELS: Record<string, string> = {
  farm:        "🌾 Ferme",
  mine:        "⛏️ Mine",
  barracks:    "⚔️ Caserne",
  market:      "🛒 Marché",
  bank:        "🏦 Banque",
  workshop:    "🔨 Atelier",
  library:     "📚 Bibliothèque",
  temple:      "🕍 Temple",
  wall:        "🧱 Rempart",
  tower:       "🗼 Tour de guet",
  harbor:      "⚓ Port",
  stable:      "🐎 Écurie",
  blacksmith:  "⚒️ Forgeron",
  sawmill:     "🪓 Scierie",
  granary:     "🏚️ Grenier",
};

function buildingLabel(b: string): string {
  return BUILDING_LABELS[b] ?? `🏗️ ${b}`;
}

// ─── Item icon ────────────────────────────────────────────────────────────────

function ItemIcon({ type }: { type: string }) {
  const cls = "w-3 h-3";
  switch (type) {
    case "carte":                  return <Scroll className={cls} />;
    case "objet_magique":          return <Sparkles className={cls} />;
    case "artefact":               return <Gem className={cls} />;
    case "relique":                return <Shield className={cls} />;
    case "document":               return <Scroll className={cls} />;
    case "equipement_legendaire":  return <Sword className={cls} />;
    default:                       return <Package className={cls} />;
  }
}

const RARITY_COLOR: Record<string, string> = {
  commun:    "text-gray-500",
  rare:      "text-blue-500",
  epique:    "text-purple-500",
  legendaire:"text-orange-500",
  mythique:  "text-red-500",
};

// ─── Composant Buildings au survol ────────────────────────────────────────────

function BuildingsTooltip({ buildings }: { buildings: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(v => !v)}
        className="text-amber-700 hover:text-amber-900 text-xs underline decoration-dotted"
      >
        🏗️ {buildings.length} bâtiment{buildings.length !== 1 ? "s" : ""}
      </button>
      {open && buildings.length > 0 && (
        <div className="absolute z-50 left-0 top-5 bg-white border border-amber-300 rounded shadow-lg p-2 min-w-40 text-xs text-amber-900 space-y-0.5">
          {buildings.map(b => (
            <div key={b} className="whitespace-nowrap">{buildingLabel(b)}</div>
          ))}
        </div>
      )}
      {open && buildings.length === 0 && (
        <div className="absolute z-50 left-0 top-5 bg-white border border-amber-200 rounded shadow p-2 text-xs text-amber-500 italic whitespace-nowrap">
          Aucun bâtiment construit
        </div>
      )}
    </span>
  );
}

// ─── TreasuryPanel ────────────────────────────────────────────────────────────

export function TreasuryPanel({ currentUser, role, adminModeEnabled }: Props) {
  const [economy,     setEconomy]     = useState<EconomyDTO | null>(null);
  const [bank,        setBank]        = useState<PlayerBankDTO | null>(null);
  const [cities,      setCities]      = useState<CityFull[]>([]);
  const [harvests,    setHarvests]    = useState<Record<number, CityHarvestState>>({});
  const [items,       setItems]       = useState<UniqueItem[]>([]);

  const [loading,     setLoading]     = useState(true);
  const [itemsLoaded, setItemsLoaded] = useState(false);

  // ─── Chargement principal ────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();

      const [ecoRes, bankRes, citiesRes, itemsRes] = await Promise.allSettled([
        fetchMyEconomy(),
        getPlayerBank(),
        fetch("/api/cities/me", { headers }).then(r => r.ok ? r.json() : []),
        fetch("/api/unique-items/player", { headers }).then(r => r.ok ? r.json() : []),
      ]);

      if (ecoRes.status   === "fulfilled") setEconomy(ecoRes.value);
      if (bankRes.status  === "fulfilled") setBank(bankRes.value);

      const cityList: CityFull[] = citiesRes.status === "fulfilled" ? citiesRes.value : [];
      setCities(cityList);

      if (itemsRes.status === "fulfilled") { setItems(itemsRes.value); setItemsLoaded(true); }

      // Harvest par ville en parallèle
      if (cityList.length > 0) {
        const initial: Record<number, CityHarvestState> = {};
        for (const c of cityList) {
          initial[c.id] = { data: null, loading: true, error: null, collecting: false, message: null };
        }
        setHarvests(initial);

        const harvestResults = await Promise.allSettled(cityList.map(c => getCityHarvest(c.id)));
        setHarvests(prev => {
          const next = { ...prev };
          cityList.forEach((c, i) => {
            const r = harvestResults[i];
            if (r.status === "fulfilled") {
              next[c.id] = { ...next[c.id], data: r.value, loading: false };
            } else {
              next[c.id] = { ...next[c.id], loading: false, error: "Erreur harvest" };
            }
          });
          return next;
        });
      }
    } catch (err) {
      console.error("[TreasuryPanel] loadAll:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ─── Collecte physique ────────────────────────────────────────────────────

  const handleCollect = async (cityId: number) => {
    setHarvests(prev => ({ ...prev, [cityId]: { ...prev[cityId], collecting: true, message: null } }));
    try {
      const result = await postCollectHarvest(cityId, role ?? undefined, adminModeEnabled);
      const min = Math.ceil((result.action.msRemaining ?? 0) / 60000);
      const msg = adminModeEnabled
        ? "✅ Collecte immédiate (mode admin)"
        : `⏳ ${min} min restante${min > 1 ? "s" : ""}`;
      setHarvests(prev => ({ ...prev, [cityId]: { ...prev[cityId], collecting: false, message: msg } }));
      // Rafraîchit après délai
      setTimeout(() => {
        getCityHarvest(cityId)
          .then(data => setHarvests(prev => ({ ...prev, [cityId]: { ...prev[cityId], data } })))
          .catch(() => {});
      }, adminModeEnabled ? 800 : 2000);
    } catch (err: any) {
      const msg = err.message?.startsWith("ACTION_ALREADY_ACTIVE")
        ? "⚠️ Action déjà en cours"
        : `❌ ${err.message ?? "Erreur"}`;
      setHarvests(prev => ({ ...prev, [cityId]: { ...prev[cityId], collecting: false, message: msg } }));
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Titre + bouton rafraîchir */}
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-base text-amber-900">💰 Trésorerie</h4>
        <button
          onClick={loadAll}
          disabled={loading}
          className="text-xs px-2 py-1 bg-amber-700 text-amber-50 rounded hover:bg-amber-600 disabled:opacity-50"
        >
          {loading ? "…" : "↻ Actualiser"}
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION A — Vue globale (réserves faction + production par tour)
      ═══════════════════════════════════════════════════════════════════════ */}
      <Section title="📊 Vue Globale">
        {economy ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <StatBox icon="💰" label="Or faction"      value={economy.gold} />
              <StatBox icon="🌾" label="Nourrit. faction" value={economy.food} />
              <StatBox icon="📈" label="+Or/tour"        value={`+${economy.goldPerTurn}`} />
              <StatBox icon="📈" label="+Nour./tour"     value={`+${economy.foodPerTurn}`} />
            </div>
            <p className="text-xs text-amber-500 text-right">Tour traité : {economy.lastProcessedTurn}</p>
          </div>
        ) : (
          <LoadingOrError loading={loading} fallback="Aucune faction — pas de données économiques." />
        )}
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION B — Inventaire de transport du joueur (objets uniques)
      ═══════════════════════════════════════════════════════════════════════ */}
      <Section title="🎒 Inventaire de Transport">
        <p className="text-xs text-amber-600 mb-2 italic">
          Capacité : 5 emplacements — Cet inventaire sert au portage physique de matériaux et objets.
          Les matériaux doivent être acheminés par action en jeu avant toute utilisation.
        </p>

        {/* Indicateur de slots */}
        <div className="flex gap-1 mb-3">
          {Array.from({ length: 5 }).map((_, i) => {
            const occupied = i < items.length;
            return (
              <div
                key={i}
                className={[
                  "w-8 h-8 rounded border-2 flex items-center justify-center text-xs",
                  occupied
                    ? "border-amber-600 bg-amber-100"
                    : "border-amber-300 bg-amber-50 text-amber-300",
                ].join(" ")}
                title={occupied ? items[i]?.name : "Emplacement libre"}
              >
                {occupied ? <Package className="w-3 h-3 text-amber-700" /> : "·"}
              </div>
            );
          })}
          {items.length > 5 && (
            <div className="w-8 h-8 rounded border-2 border-red-400 bg-red-50 flex items-center justify-center text-xs text-red-600 font-bold">
              +{items.length - 5}
            </div>
          )}
        </div>

        {!itemsLoaded ? (
          <p className="text-xs text-amber-500">Chargement…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-amber-500 italic">Aucun objet porté.</p>
        ) : (
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {items.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between text-xs bg-amber-50 border border-amber-200 rounded p-1"
                title={item.description}
              >
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className={RARITY_COLOR[item.rarity] ?? "text-gray-500"}>
                    <ItemIcon type={item.type} />
                  </span>
                  <span className="text-amber-900 truncate">{item.name}</span>
                </div>
                <span className="text-amber-700 font-bold shrink-0">{item.value}⚡</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION C — Banque personnelle du joueur
      ═══════════════════════════════════════════════════════════════════════ */}
      <Section title="🏦 Banque Personnelle">
        {bank ? (
          <div className="space-y-1">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <StatBox icon="🪙" label="Or accumulé"       value={bank.gold} />
              <StatBox icon="🌿" label="Nour. accumulée"   value={bank.food} />
            </div>
            <p className="text-xs text-amber-500 text-right">Dernier tick : tour {bank.lastProductionTurn}</p>
            <p className="text-xs text-amber-500 italic">
              Crédité automatiquement par les villes disposant d'une banque.
            </p>
          </div>
        ) : (
          <LoadingOrError loading={loading} fallback="Aucune banque — construisez une banque dans une ville." />
        )}
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION D — Villes (production, bâtiments, harvest, collecte)
      ═══════════════════════════════════════════════════════════════════════ */}
      <Section title={`🏘️ Villes (${cities.length})`}>
        {loading && cities.length === 0 ? (
          <p className="text-xs text-amber-500">Chargement des villes…</p>
        ) : cities.length === 0 ? (
          <p className="text-xs text-amber-500 italic">Aucune ville dans votre faction.</p>
        ) : (
          <div className="space-y-3">
            {cities.map(city => {
              const h = harvests[city.id];
              return (
                <div key={city.id} className="bg-white border border-amber-200 rounded p-3 text-xs">

                  {/* En-tête ville */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-bold text-amber-900 text-sm">{city.name}</span>
                      <span className="ml-2 text-amber-500">👥 {city.population}</span>
                    </div>
                    {h?.data?.hasBank && (
                      <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs shrink-0">
                        🏦 versement auto
                      </span>
                    )}
                  </div>

                  {/* Production par tour */}
                  <div className="flex gap-3 mb-2 text-amber-700">
                    <span>📈 +{city.goldPerTurn ?? 0}🪙/tour</span>
                    <span>📈 +{city.foodPerTurn ?? 0}🌿/tour</span>
                  </div>

                  {/* Bâtiments avec survol */}
                  <div className="mb-2">
                    <BuildingsTooltip buildings={city.buildings ?? []} />
                  </div>

                  {/* Harvest */}
                  {h ? (
                    h.loading ? (
                      <p className="text-amber-400 italic">Chargement harvest…</p>
                    ) : h.error ? (
                      <p className="text-red-400">{h.error}</p>
                    ) : h.data ? (
                      <div className="space-y-1">
                        <div className="flex gap-4 text-amber-700">
                          <span>⏳ Pending : {h.data.pending.gold}🪙 {h.data.pending.food}🌿</span>
                          <span>📦 Inventaire : {h.data.inventory.gold}🪙 {h.data.inventory.food}🌿</span>
                        </div>

                        {/* Bouton collecte */}
                        {!h.data.hasBank && (
                          <div className="mt-1.5">
                            <button
                              onClick={() => handleCollect(city.id)}
                              disabled={
                                h.collecting ||
                                (h.data.pending.gold === 0 && h.data.pending.food === 0)
                              }
                              className={[
                                "px-2 py-0.5 rounded text-xs font-semibold transition",
                                h.collecting
                                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                  : h.data.pending.gold === 0 && h.data.pending.food === 0
                                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                    : "bg-amber-500 hover:bg-amber-600 text-white",
                              ].join(" ")}
                            >
                              {h.collecting ? "⏳ Collecte…" : "🚜 Collecter la récolte"}
                            </button>
                          </div>
                        )}

                        {/* Message retour */}
                        {h.message && (
                          <p className="text-amber-700 font-medium mt-1">{h.message}</p>
                        )}
                      </div>
                    ) : null
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Section>

    </div>
  );
}

// ─── Sous-composants utilitaires ─────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gradient-to-b from-amber-50 to-amber-100 border border-amber-300 rounded-lg p-3">
      <h5 className="font-semibold text-amber-900 text-xs uppercase tracking-wide mb-2 border-b border-amber-200 pb-1">
        {title}
      </h5>
      {children}
    </div>
  );
}

function StatBox({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="bg-white border border-amber-200 rounded p-2 flex items-center gap-2">
      <span className="text-base">{icon}</span>
      <div>
        <div className="text-xs text-amber-600 leading-tight">{label}</div>
        <div className="font-bold text-amber-900 text-sm leading-tight">{value}</div>
      </div>
    </div>
  );
}

function LoadingOrError({ loading, fallback }: { loading: boolean; fallback: string }) {
  return (
    <p className="text-xs text-amber-500 italic">
      {loading ? "Chargement…" : fallback}
    </p>
  );
}
