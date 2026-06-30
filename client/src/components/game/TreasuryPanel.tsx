import { useState, useEffect, useCallback } from "react";
import {
  getPlayerBank,
  getPlayerTransport,
  getCityHarvest,
  getCityWarehouseInfo,
  postCollectHarvest,
  postTransferBankToCity,
  postTransferBankToPlayer,
  postDepositTransportToBank,
  type PlayerBankDTO,
  type PlayerTransportDTO,
  type CityHarvestDTO,
  type CityWarehouseInfoDTO,
} from "../../lib/api/economyApi";
import { usePlayerActions } from "../../lib/stores/usePlayerActions";

// ─── Types ─────────────────────────────────────────────────────────────────

interface CityFull {
  id:               number;
  name:             string;
  population:       number;
  buildings:        string[];
  fractenPerTurn:   number;
  foodPerTurn:      number;
  woodPerTurn?:     number;
  stonePerTurn?:    number;
  commonMetalsPerTurn?: number;
  coalPerTurn?:     number;
  oilPerTurn?:      number;
  herbsPerTurn?:    number;
  leatherFurPerTurn?: number;
}

interface CityHarvestState {
  data:       CityHarvestDTO | null;
  loading:    boolean;
  error:      string | null;
  collecting: boolean;
  message:    string | null;
}

interface TransferState {
  fracten:       string;
  common_metals: string;
  leather_fur:   string;
  food:          string;
  wood:          string;
  stone:         string;
  coal:          string;
  oil:           string;
  herbs:         string;
  cityId:  string;
  loading: boolean;
  message: string | null;
}

interface Props {
  currentUser?:      string;
  role?:             string | null;
  adminModeEnabled?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAuthHeaders(): Record<string, string> {
  const saved = localStorage.getItem("nova_imperium_auth");
  if (!saved) return {};
  const { token } = JSON.parse(saved);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function parseAmount(s: string): number {
  const n = parseInt(s, 10);
  return isNaN(n) || n < 0 ? 0 : n;
}

type Mats = {
  fracten?:       number;
  common_metals?: number;
  leather_fur?:   number;
  food?:          number;
  wood?:          number;
  stone?:         number;
  coal?:          number;
  oil?:           number;
  herbs?:         number;
};

function isMatsEmpty(m: Mats): boolean {
  return (m.fracten ?? 0) === 0 && (m.common_metals ?? 0) === 0 && (m.leather_fur ?? 0) === 0
      && (m.food ?? 0) === 0 && (m.wood ?? 0) === 0 && (m.stone ?? 0) === 0
      && (m.coal ?? 0) === 0 && (m.oil ?? 0) === 0 && (m.herbs ?? 0) === 0;
}

const MAT_ICONS: Array<[keyof Mats, string]> = [
  ['fracten','💎'],['common_metals','⚒️'],['leather_fur','🧥'],
  ['food','🌾'],['wood','🪵'],['stone','🪨'],['coal','⚫'],['oil','🛢️'],['herbs','🌿'],
];

function formatMats(m: Mats): string {
  const parts = MAT_ICONS
    .map(([k, icon]) => ((m[k] ?? 0) > 0 ? `${m[k]}${icon}` : null))
    .filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : '—';
}

// ─── Source de vérité unique des ressources UI ────────────────────────────────

type ResourceKey = keyof Mats;

interface ResourceDef {
  key:   ResourceKey;
  icon:  string;
  label: string;
}

const RESOURCE_DEFS: ResourceDef[] = [
  { key: 'fracten',       icon: '💎', label: 'Fracten'               },
  { key: 'common_metals', icon: '⚒️', label: 'Métaux communs'        },
  { key: 'leather_fur',   icon: '🧥', label: 'Cuir & fourrure'       },
  { key: 'food',          icon: '🌾', label: 'Nourriture'            },
  { key: 'wood',          icon: '🪵', label: 'Bois'                  },
  { key: 'stone',         icon: '🪨', label: 'Pierre'                },
  { key: 'coal',          icon: '⚫', label: 'Charbon'               },
  { key: 'oil',           icon: '🛢️', label: 'Pétrole'               },
  { key: 'herbs',         icon: '🌿', label: 'Herbes'                },
];

function visibleResources(
  defs: ResourceDef[],
  source: Record<string, number | undefined | null>,
): ResourceDef[] {
  return defs.filter(d => (source[d.key] ?? 0) > 0);
}

// ─── Composant de ligne de ressource unique ───────────────────────────────────

function ActiveResourceRow({
  icon, label, available, value, onChange, onSetMax,
}: {
  icon:      string;
  label:     string;
  available: number;
  value:     string;
  onChange:  (v: string) => void;
  onSetMax:  () => void;
}) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="w-5 text-center">{icon}</span>
      <span className="text-xs text-amber-800 w-20 shrink-0">{label}</span>
      <span className="text-xs text-amber-500 w-12 shrink-0">· {available}</span>
      <input
        type="number"
        min="0"
        max={available}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-16 text-xs border border-amber-300 rounded px-1 py-0.5 text-amber-900 bg-white"
        placeholder="0"
      />
      <button
        type="button"
        onClick={onSetMax}
        className="text-xs px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded border border-amber-300"
      >
        Max
      </button>
    </div>
  );
}

// ─── Bâtiments ────────────────────────────────────────────────────────────────

const BUILDING_LABELS: Record<string, string> = {
  farm:       "🌾 Ferme",   mine:     "⛏️ Mine",    barracks: "⚔️ Caserne",
  market:     "🛒 Marché",  bank:     "🏦 Banque",   workshop: "🔨 Atelier",
  library:    "📚 Bibliothèque", temple: "🕍 Temple", wall:    "🧱 Rempart",
  tower:      "🗼 Tour de guet", harbor: "⚓ Port",   stable:  "🐎 Écurie",
  blacksmith: "⚒️ Forgeron", sawmill: "🪓 Scierie",  granary: "🏚️ Grenier",
  entrepot:   "🏪 Entrepôt",
};
function buildingLabel(b: string) { return BUILDING_LABELS[b] ?? `🏗️ ${b}`; }

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
      {open && (
        <div className="absolute z-50 left-0 top-5 bg-white border border-amber-300 rounded shadow-lg p-2 min-w-44 text-xs text-amber-900 space-y-0.5">
          {buildings.length === 0
            ? <span className="italic text-amber-400">Aucun bâtiment</span>
            : buildings.map(b => <div key={b} className="whitespace-nowrap">{buildingLabel(b)}</div>)
          }
        </div>
      )}
    </span>
  );
}

// ─── TreasuryPanel ────────────────────────────────────────────────────────────

export function TreasuryPanel({ currentUser, role, adminModeEnabled }: Props) {
  const [bank,       setBank]       = useState<PlayerBankDTO | null>(null);
  const [transport,  setTransport]  = useState<PlayerTransportDTO | null>(null);
  const [cities,     setCities]     = useState<CityFull[]>([]);
  const [harvests,   setHarvests]   = useState<Record<number, CityHarvestState>>({});
  const [warehouses, setWarehouses] = useState<Record<number, CityWarehouseInfoDTO | null>>({});
  const [loading,    setLoading]    = useState(true);

  // ─── Accès physique banque ─────────────────────────────────────────────────
  const [bankAccess, setBankAccess] = useState<{
    loading: boolean; allowed: boolean; reason: string | null; isAdmin: boolean;
  }>({ loading: true, allowed: false, reason: null, isAdmin: false });

  const loadBankAccess = useCallback(async () => {
    setBankAccess(a => ({ ...a, loading: true }));
    try {
      const headers = getAuthHeaders();
      const resp = await fetch("/api/economy/bank-access-check", { headers });
      if (!resp.ok) { setBankAccess({ loading: false, allowed: false, reason: "Erreur serveur", isAdmin: false }); return; }
      const data = await resp.json();
      setBankAccess({ loading: false, allowed: data.allowed ?? false, reason: data.reason ?? null, isAdmin: data.isAdmin ?? false });
    } catch {
      setBankAccess({ loading: false, allowed: false, reason: "Erreur réseau", isAdmin: false });
    }
  }, []);

  // ─── Accès physique marché ─────────────────────────────────────────────────
  const [hasMarketAccess, setHasMarketAccess] = useState(false);

  const checkMarketAccess = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const resp = await fetch("/api/market/access-check", { headers });
      if (!resp.ok) { setHasMarketAccess(false); return; }
      const data = await resp.json();
      setHasMarketAccess(data.allowed === true);
    } catch { setHasMarketAccess(false); }
  }, []);

  // États transfert
  const EMPTY_TRANSFER: TransferState = {
    fracten: "", common_metals: "", leather_fur: "",
    food: "", wood: "", stone: "", coal: "", oil: "", herbs: "",
    cityId: "", loading: false, message: null,
  };

  const [toCity,   setToCity]   = useState<TransferState>(EMPTY_TRANSFER);
  const [toPlayer, setToPlayer] = useState<TransferState>(EMPTY_TRANSFER);
  const [toBank,   setToBank]   = useState<TransferState>(EMPTY_TRANSFER);

  // ─── Chargement ─────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();

      const [bankRes, transportRes, citiesRes] = await Promise.allSettled([
        getPlayerBank(),
        getPlayerTransport(),
        fetch("/api/cities/me", { headers }).then(r => r.ok ? r.json() : []),
      ]);

      if (bankRes.status === "fulfilled")      setBank(bankRes.value);
      if (transportRes.status === "fulfilled") setTransport(transportRes.value);

      const cityList: CityFull[] = citiesRes.status === "fulfilled" ? citiesRes.value : [];
      setCities(cityList);

      if (cityList.length > 0) {
        const init: Record<number, CityHarvestState> = {};
        for (const c of cityList) {
          init[c.id] = { data: null, loading: true, error: null, collecting: false, message: null };
        }
        setHarvests(init);

        const [harvestResults, warehouseResults] = await Promise.all([
          Promise.allSettled(cityList.map(c => getCityHarvest(c.id))),
          Promise.allSettled(cityList.map(c => getCityWarehouseInfo(c.id))),
        ]);

        setHarvests(prev => {
          const next = { ...prev };
          cityList.forEach((c, i) => {
            const r = harvestResults[i];
            next[c.id] = r.status === "fulfilled"
              ? { ...next[c.id], data: r.value, loading: false }
              : { ...next[c.id], loading: false, error: "Erreur harvest" };
          });
          return next;
        });

        const wh: Record<number, CityWarehouseInfoDTO | null> = {};
        cityList.forEach((c, i) => {
          const r = warehouseResults[i];
          wh[c.id] = r.status === "fulfilled" ? r.value : null;
        });
        setWarehouses(wh);
      }
    } catch (err) {
      console.error("[TreasuryPanel] loadAll:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); loadBankAccess(); checkMarketAccess(); }, [loadAll, loadBankAccess, checkMarketAccess]);

  useEffect(() => {
    const handler = () => { loadAll(); loadBankAccess(); checkMarketAccess(); };
    window.addEventListener('nova:logistic-refresh', handler);
    return () => window.removeEventListener('nova:logistic-refresh', handler);
  }, [loadAll, loadBankAccess, checkMarketAccess]);

  // ─── Collecte physique ────────────────────────────────────────────────────

  const handleCollect = async (cityId: number) => {
    setHarvests(prev => ({ ...prev, [cityId]: { ...prev[cityId], collecting: true, message: null } }));
    try {
      const result = await postCollectHarvest(cityId, role ?? undefined, adminModeEnabled);
      const min = Math.ceil((result.action.msRemaining ?? 0) / 60000);
      const msg = adminModeEnabled
        ? "✅ Collecte immédiate (admin)"
        : `⏳ ${min} min restante${min > 1 ? "s" : ""}`;
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

  // ─── Transfert banque → ville ─────────────────────────────────────────────

  const handleTransferToCity = async () => {
    const cityId = parseInt(toCity.cityId, 10);
    const mats = {
      fracten:       parseAmount(toCity.fracten),
      common_metals: parseAmount(toCity.common_metals),
      leather_fur:   parseAmount(toCity.leather_fur),
      food:          parseAmount(toCity.food),
      wood:          parseAmount(toCity.wood),
      stone:         parseAmount(toCity.stone),
      coal:          parseAmount(toCity.coal),
      oil:           parseAmount(toCity.oil),
      herbs:         parseAmount(toCity.herbs),
    };
    if (isNaN(cityId) || cityId < 1) {
      setToCity(prev => ({ ...prev, message: "❌ Sélectionnez une ville" }));
      return;
    }
    if (isMatsEmpty(mats)) {
      setToCity(prev => ({ ...prev, message: "❌ Montant nul" }));
      return;
    }
    setToCity(prev => ({ ...prev, loading: true, message: null }));
    try {
      const res = await postTransferBankToCity(cityId, mats, adminModeEnabled);
      usePlayerActions.getState().setActiveAction(res.action);
      const min = res.action.minRemaining;
      const msg = adminModeEnabled
        ? `✅ Transfert immédiat vers ville (admin)`
        : `⏳ Transfert en cours — ${min} min`;
      setToCity(prev => ({ ...prev, loading: false, message: msg,
        fracten: "", common_metals: "", leather_fur: "",
        food: "", wood: "", stone: "", coal: "", oil: "", herbs: "" }));
      setTimeout(() => {
        getPlayerBank().then(b => setBank(b)).catch(() => {});
        window.dispatchEvent(new CustomEvent('nova:logistic-refresh'));
      }, 300);
    } catch (err: any) {
      const raw = err.message ?? "Erreur transfert";
      let msg = `❌ ${raw}`;
      // F1 V2 — codes renommés (+ aliases V1 pour backward-compat)
      if (raw.includes("INSUFFICIENT_BANK_FRACTEN") || raw.includes("INSUFFICIENT_BANK_GOLD"))
                                                               msg = "❌ Fracten insuffisant en banque";
      else if (raw.includes("INSUFFICIENT_BANK_FOOD"))        msg = "❌ Nourriture insuffisante en banque";
      else if (raw.includes("INSUFFICIENT_BANK_WOOD"))        msg = "❌ Bois insuffisant en banque";
      else if (raw.includes("INSUFFICIENT_BANK_STONE"))       msg = "❌ Pierre insuffisante en banque";
      else if (raw.includes("INSUFFICIENT_BANK_COMMON_METALS") || raw.includes("INSUFFICIENT_BANK_IRON") || raw.includes("INSUFFICIENT_BANK_COPPER"))
                                                               msg = "❌ Métaux communs insuffisants en banque";
      else if (raw.includes("INSUFFICIENT_BANK_COAL"))        msg = "❌ Charbon insuffisant en banque";
      else if (raw.includes("INSUFFICIENT_BANK_OIL"))         msg = "❌ Pétrole insuffisant en banque";
      else if (raw.includes("INSUFFICIENT_BANK_HERBS"))       msg = "❌ Herbes insuffisantes en banque";
      else if (raw.includes("INSUFFICIENT_BANK_LEATHER_FUR") || raw.includes("INSUFFICIENT_BANK_FUR"))
                                                               msg = "❌ Cuir & fourrure insuffisants en banque";
      else if (raw.includes("ACTION_ALREADY_ACTIVE"))          msg = "⚠️ Action déjà en cours";
      setToCity(prev => ({ ...prev, loading: false, message: msg }));
    }
  };

  // ─── Transfert banque → joueur ────────────────────────────────────────────

  const handleTransferToPlayer = async () => {
    const mats = {
      fracten:       parseAmount(toPlayer.fracten),
      common_metals: parseAmount(toPlayer.common_metals),
      leather_fur:   parseAmount(toPlayer.leather_fur),
      food:          parseAmount(toPlayer.food),
      wood:          parseAmount(toPlayer.wood),
      stone:         parseAmount(toPlayer.stone),
      coal:          parseAmount(toPlayer.coal),
      oil:           parseAmount(toPlayer.oil),
      herbs:         parseAmount(toPlayer.herbs),
    };
    if (isMatsEmpty(mats)) {
      setToPlayer(prev => ({ ...prev, message: "❌ Montant nul" }));
      return;
    }
    setToPlayer(prev => ({ ...prev, loading: true, message: null }));
    try {
      const res = await postTransferBankToPlayer(mats, adminModeEnabled);
      usePlayerActions.getState().setActiveAction(res.action);
      const min = res.action.minRemaining;
      const msg = adminModeEnabled
        ? "✅ Transfert immédiat sur vous (admin)"
        : `⏳ Transfert en cours — ${min} min`;
      setToPlayer(prev => ({ ...prev, loading: false, message: msg,
        fracten: "", common_metals: "", leather_fur: "",
        food: "", wood: "", stone: "", coal: "", oil: "", herbs: "" }));
      // Rafraîchit uniquement la banque (déjà débitée immédiatement).
      // Le refresh inventaire transport est déclenché par ActiveActionWidget
      // à la vraie complétion (nova:logistic-refresh @ completion réelle).
      setTimeout(() => {
        getPlayerBank().then(b => setBank(b)).catch(() => {});
      }, 300);
    } catch (err: any) {
      const raw = err.message ?? "Erreur transfert";
      let msg = `❌ ${raw}`;
      // F1 V2 — codes renommés (+ aliases V1 pour backward-compat)
      if (raw.includes("INSUFFICIENT_BANK_FRACTEN") || raw.includes("INSUFFICIENT_BANK_GOLD"))
                                                               msg = "❌ Fracten insuffisant en banque";
      else if (raw.includes("INSUFFICIENT_BANK_FOOD"))        msg = "❌ Nourriture insuffisante en banque";
      else if (raw.includes("INSUFFICIENT_BANK_WOOD"))        msg = "❌ Bois insuffisant en banque";
      else if (raw.includes("INSUFFICIENT_BANK_STONE"))       msg = "❌ Pierre insuffisante en banque";
      else if (raw.includes("INSUFFICIENT_BANK_COMMON_METALS") || raw.includes("INSUFFICIENT_BANK_IRON") || raw.includes("INSUFFICIENT_BANK_COPPER"))
                                                               msg = "❌ Métaux communs insuffisants en banque";
      else if (raw.includes("INSUFFICIENT_BANK_COAL"))        msg = "❌ Charbon insuffisant en banque";
      else if (raw.includes("INSUFFICIENT_BANK_OIL"))         msg = "❌ Pétrole insuffisant en banque";
      else if (raw.includes("INSUFFICIENT_BANK_HERBS"))       msg = "❌ Herbes insuffisantes en banque";
      else if (raw.includes("INSUFFICIENT_BANK_LEATHER_FUR") || raw.includes("INSUFFICIENT_BANK_FUR"))
                                                               msg = "❌ Cuir & fourrure insuffisants en banque";
      else if (raw.includes("ACTION_ALREADY_ACTIVE"))          msg = "⚠️ Action déjà en cours";
      else if (raw.includes("TRANSPORT_CAPACITY_EXCEEDED"))    msg = "❌ Capacité de transport dépassée (max 50 unités)";
      setToPlayer(prev => ({ ...prev, loading: false, message: msg }));
    }
  };

  // ─── Dépôt transport → banque ─────────────────────────────────────────────

  const handleDepositToBank = async () => {
    const mats = {
      fracten:       parseAmount(toBank.fracten),
      common_metals: parseAmount(toBank.common_metals),
      leather_fur:   parseAmount(toBank.leather_fur),
      food:   parseAmount(toBank.food),
      wood:   parseAmount(toBank.wood),
      stone:  parseAmount(toBank.stone),
      coal:   parseAmount(toBank.coal),
      oil:    parseAmount(toBank.oil),
      herbs:  parseAmount(toBank.herbs),
    };
    if (Object.values(mats).every(v => v === 0)) {
      setToBank(prev => ({ ...prev, message: "❌ Montant nul" }));
      return;
    }
    setToBank(prev => ({ ...prev, loading: true, message: null }));
    try {
      await postDepositTransportToBank(mats);
      setToBank(prev => ({ ...prev, loading: false, message: "✅ Déposé en banque",
        fracten: "", common_metals: "", leather_fur: "",
        food: "", wood: "", stone: "", coal: "", oil: "", herbs: "" }));
      setTimeout(() => {
        Promise.allSettled([getPlayerBank(), getPlayerTransport()]).then(([b, t]) => {
          if (b.status === "fulfilled") setBank(b.value);
          if (t.status === "fulfilled") setTransport(t.value);
        });
        window.dispatchEvent(new CustomEvent('nova:logistic-refresh'));
      }, 300);
    } catch (err: any) {
      const raw = err.message ?? "Erreur dépôt";
      let msg = `❌ ${raw}`;
      if (raw.includes("INSUFFICIENT_TRANSPORT")) msg = "❌ Stock transport insuffisant";
      else if (raw.includes("403") || raw.startsWith("BANK_ACCESS")) msg = "❌ Accès banque requis";
      setToBank(prev => ({ ...prev, loading: false, message: msg }));
    }
  };

  // ─── Réseau bancaire — villes connectées ──────────────────────────────────

  const bankCities = cities.filter(c => c.buildings?.includes('bank'));

  // ─── Ressources visibles par source ──────────────────────────────────────

  const bankVisible      = bank      ? visibleResources(RESOURCE_DEFS, bank as any)      : [];
  const transportVisible = transport ? visibleResources(RESOURCE_DEFS, transport as any) : [];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">

      {/* Titre + rafraîchir */}
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-base text-amber-900">🏦 Réseau Bancaire</h4>
        <div className="flex items-center gap-2">
          {hasMarketAccess && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('nova:open-panel', { detail: { panel: 'marketplace' } }))}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-amber-50 rounded text-xs font-semibold transition-colors"
              style={{ pointerEvents: 'auto' }}
              title="Accéder au marché"
            >
              <span>🏪</span>
              <span>Marché</span>
            </button>
          )}
          <button
            onClick={loadAll}
            disabled={loading}
            className="text-xs px-2 py-1 bg-amber-700 text-amber-50 rounded hover:bg-amber-600 disabled:opacity-50"
          >
            {loading ? "…" : "↻ Actualiser"}
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 1 — Solde Banque + Transferts
      ════════════════════════════════════════════════════════════════════ */}
      <Section title="💰 Solde & Transferts">
        {bankAccess.loading ? (
          <p className="text-xs text-amber-500 italic">Vérification présence banque…</p>
        ) : !bankAccess.allowed ? (
          <div className="border border-amber-300 bg-amber-100 rounded p-3 text-xs">
            <p className="font-semibold text-amber-900 mb-1">🔒 Accès refusé</p>
            <p className="text-amber-700 mb-2">
              {bankAccess.reason ?? "Vous devez vous trouver physiquement sur une case contenant une Banque pour accéder à ce service."}
            </p>
            <button
              onClick={loadBankAccess}
              className="px-2 py-0.5 bg-amber-700 text-white rounded text-xs hover:bg-amber-800"
            >
              🔄 Vérifier à nouveau
            </button>
          </div>
        ) : bank ? (
          <>
            {/* A. Solde — liste compacte des ressources actives seulement */}
            <div className="mb-3">
              {bankVisible.length === 0 ? (
                <p className="text-xs text-amber-400 italic">Aucune ressource en banque</p>
              ) : (
                <div className="space-y-0.5">
                  {bankVisible.map(({ key, icon, label }) => (
                    <div key={key} className="flex items-center gap-1.5 text-xs text-amber-800">
                      <span>{icon}</span>
                      <span className="font-medium">{label}</span>
                      <span className="text-amber-500">·</span>
                      <span className="font-bold text-amber-900">{(bank as any)[key] ?? 0}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-amber-500 italic mt-1.5">
                Dépôt auto des villes connectées · Tour {bank.lastProductionTurn}
              </p>
            </div>

            {/* B. Transférer vers une ville du réseau */}
            <div className="border-t border-amber-200 pt-2 mb-2">
              <p className="text-xs text-amber-600 font-semibold mb-2">Transférer vers une ville du réseau</p>
              {bankCities.length === 0 ? (
                <p className="text-xs text-amber-400 italic">Aucune ville connectée au réseau bancaire.</p>
              ) : bankVisible.length === 0 ? (
                <p className="text-xs text-amber-400 italic">Aucune ressource disponible en banque.</p>
              ) : (
                <>
                  <select
                    value={toCity.cityId}
                    onChange={e => setToCity(prev => ({ ...prev, cityId: e.target.value }))}
                    className="text-xs border border-amber-300 rounded px-1 py-0.5 text-amber-900 bg-white w-full mb-2"
                  >
                    <option value="">— Choisir une ville —</option>
                    {bankCities.map(c => (
                      <option key={c.id} value={String(c.id)}>{c.name}</option>
                    ))}
                  </select>
                  <div className="space-y-0.5 mb-2">
                    {bankVisible.map(({ key, icon, label }) => {
                      const avail = (bank as any)[key] ?? 0;
                      return (
                        <ActiveResourceRow
                          key={key}
                          icon={icon}
                          label={label}
                          available={avail}
                          value={(toCity as any)[key]}
                          onChange={v => setToCity(p => ({ ...p, [key]: v }))}
                          onSetMax={() => setToCity(p => ({ ...p, [key]: String(avail) }))}
                        />
                      );
                    })}
                  </div>
                  <button
                    onClick={handleTransferToCity}
                    disabled={toCity.loading || !toCity.cityId}
                    className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
                  >
                    {toCity.loading ? "…" : "Envoyer"}
                  </button>
                </>
              )}
              {toCity.message && (
                <p className={[
                  "text-xs mt-1 font-medium",
                  toCity.message.startsWith("❌") || toCity.message.startsWith("⚠️")
                    ? "text-red-600" : "text-green-700"
                ].join(" ")}>
                  {toCity.message}
                </p>
              )}
            </div>

            {/* C. Prendre en transport */}
            <div className="border-t border-amber-200 pt-2 mb-2">
              <p className="text-xs text-amber-600 font-semibold mb-2">Prendre en transport</p>
              {bankVisible.length === 0 ? (
                <p className="text-xs text-amber-400 italic">Aucune ressource disponible en banque.</p>
              ) : (
                <>
                  <div className="space-y-0.5 mb-2">
                    {bankVisible.map(({ key, icon, label }) => {
                      const avail = (bank as any)[key] ?? 0;
                      return (
                        <ActiveResourceRow
                          key={key}
                          icon={icon}
                          label={label}
                          available={avail}
                          value={(toPlayer as any)[key]}
                          onChange={v => setToPlayer(p => ({ ...p, [key]: v }))}
                          onSetMax={() => setToPlayer(p => ({ ...p, [key]: String(avail) }))}
                        />
                      );
                    })}
                  </div>
                  <button
                    onClick={handleTransferToPlayer}
                    disabled={toPlayer.loading}
                    className="text-xs px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded disabled:opacity-50"
                  >
                    {toPlayer.loading ? "…" : "Prendre"}
                  </button>
                </>
              )}
              {toPlayer.message && (
                <p className={[
                  "text-xs mt-1 font-medium",
                  toPlayer.message.startsWith("❌") || toPlayer.message.startsWith("⚠️")
                    ? "text-red-600" : "text-green-700"
                ].join(" ")}>
                  {toPlayer.message}
                </p>
              )}
            </div>

            {/* D. Déposer à la banque */}
            <div className="border-t border-amber-200 pt-2">
              <p className="text-xs text-amber-600 font-semibold mb-1">Déposer à la banque</p>
              {transport && (
                <p className="text-xs text-amber-500 mb-2">
                  Transport : {transport.usedUnits}/{transport.maxUnits} unités
                </p>
              )}
              {transportVisible.length === 0 ? (
                <p className="text-xs text-amber-400 italic">Aucune ressource à déposer.</p>
              ) : (
                <>
                  <div className="space-y-0.5 mb-2">
                    {transportVisible.map(({ key, icon, label }) => {
                      const avail = (transport as any)[key] ?? 0;
                      return (
                        <ActiveResourceRow
                          key={key}
                          icon={icon}
                          label={label}
                          available={avail}
                          value={(toBank as any)[key]}
                          onChange={v => setToBank(p => ({ ...p, [key]: v }))}
                          onSetMax={() => setToBank(p => ({ ...p, [key]: String(avail) }))}
                        />
                      );
                    })}
                  </div>
                  <button
                    onClick={handleDepositToBank}
                    disabled={toBank.loading}
                    className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
                  >
                    {toBank.loading ? "…" : "Déposer"}
                  </button>
                </>
              )}
              {toBank.message && (
                <p className={[
                  "text-xs mt-1 font-medium",
                  toBank.message.startsWith("❌") || toBank.message.startsWith("⚠️")
                    ? "text-red-600" : "text-green-700"
                ].join(" ")}>
                  {toBank.message}
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="text-xs text-amber-400 italic">
            {loading ? "Chargement…" : "Aucune banque — construisez une banque dans une ville."}
          </p>
        )}
      </Section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 2 — Villes connectées au réseau bancaire
          Filtrées par city.buildings.includes('bank') — source canonique serveur
      ════════════════════════════════════════════════════════════════════ */}
      <Section title={`🏦 Villes connectées (${loading ? "…" : bankCities.length})`}>
        {loading && cities.length === 0 ? (
          <p className="text-xs text-amber-500">Chargement…</p>
        ) : bankCities.length === 0 ? (
          <p className="text-xs text-amber-400 italic">
            {cities.length === 0
              ? "Aucune ville dans votre faction."
              : "Aucune ville connectée au réseau bancaire. Construisez une Banque dans une ville pour l'y connecter."}
          </p>
        ) : (
          <div className="space-y-2.5">
            {bankCities.map(city => {
              const h = harvests[city.id];
              return (
                <div key={city.id} className="bg-white border border-amber-200 rounded p-2.5 text-xs">
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                    <span className="font-bold text-amber-900 text-sm">{city.name}</span>
                    <div className="flex gap-1 flex-wrap">
                      <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs">🏦 auto</span>
                      {(() => {
                        const wh = warehouses[city.id];
                        if (!wh) return null;
                        if (!wh.hasWarehouse) return (
                          <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-xs">⚠️ pas d'entrepôt</span>
                        );
                        return (
                          <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-xs">
                            🏪 Niv.{wh.level} — {wh.currentTotal}/{wh.capacity}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-amber-700 mb-1.5 text-xs">
                    {(() => {
                      const perTurn: Mats = {
                        fracten:       city.fractenPerTurn      ?? 0,
                        food:          city.foodPerTurn         ?? 0,
                        wood:          city.woodPerTurn         ?? 0,
                        stone:         city.stonePerTurn        ?? 0,
                        common_metals: city.commonMetalsPerTurn ?? 0,
                        coal:          city.coalPerTurn         ?? 0,
                        oil:           city.oilPerTurn          ?? 0,
                        herbs:         city.herbsPerTurn        ?? 0,
                        leather_fur:   city.leatherFurPerTurn   ?? 0,
                      };
                      const active = MAT_ICONS.filter(([k]) => (perTurn[k] ?? 0) > 0);
                      return active.length === 0
                        ? <span className="text-amber-400 italic">Aucune production</span>
                        : active.map(([k, icon]) => (
                            <span key={k} className="bg-amber-100 px-1 rounded">+{perTurn[k]}{icon}/tour</span>
                          ));
                    })()}
                    <BuildingsTooltip buildings={city.buildings ?? []} />
                  </div>
                  {h && !h.loading && !h.error && h.data && (
                    <div className="space-y-1 border-t border-amber-100 pt-1.5">
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-amber-600">
                        <span>⏳ {formatMats(h.data.pending)} (en attente)</span>
                        <span>📦 {formatMats(h.data.inventory)} (stock)</span>
                      </div>
                    </div>
                  )}
                  {h?.loading && <p className="text-amber-400 text-xs">Chargement…</p>}
                  {h?.error && <p className="text-red-400 text-xs">{h.error}</p>}
                </div>
              );
            })}
          </div>
        )}
      </Section>

    </div>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

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
