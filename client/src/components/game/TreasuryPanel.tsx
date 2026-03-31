import { useState, useEffect, useCallback } from "react";
import {
  getPlayerBank,
  getCityHarvest,
  postCollectHarvest,
  postTransferBankToCity,
  postTransferBankToPlayer,
  type PlayerBankDTO,
  type CityHarvestDTO,
} from "../../lib/api/economyApi";

// ─── Types ─────────────────────────────────────────────────────────────────

interface CityFull {
  id:               number;
  name:             string;
  population:       number;
  buildings:        string[];
  goldPerTurn:      number;
  foodPerTurn:      number;
  woodPerTurn?:     number;
  stonePerTurn?:    number;
  ironPerTurn?:     number;
  copperPerTurn?:   number;
  coalPerTurn?:     number;
  oilPerTurn?:      number;
  herbsPerTurn?:    number;
  furPerTurn?:      number;
}

interface CityHarvestState {
  data:       CityHarvestDTO | null;
  loading:    boolean;
  error:      string | null;
  collecting: boolean;
  message:    string | null;
}

interface TransferState {
  gold:    string;
  food:    string;
  wood:    string;
  stone:   string;
  iron:    string;
  copper:  string;
  coal:    string;
  oil:     string;
  herbs:   string;
  fur:     string;
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
  gold: number; food: number; wood: number; stone: number; iron: number;
  copper?: number; coal?: number; oil?: number; herbs?: number; fur?: number;
};

function isMatsEmpty(m: Mats): boolean {
  return m.gold === 0 && m.food === 0 && m.wood === 0 && m.stone === 0 && m.iron === 0
      && (m.copper ?? 0) === 0 && (m.coal ?? 0) === 0 && (m.oil ?? 0) === 0
      && (m.herbs ?? 0) === 0 && (m.fur ?? 0) === 0;
}

const MAT_ICONS: Array<[keyof Mats, string]> = [
  ['gold','🪙'],['food','🌿'],['wood','🪵'],['stone','🪨'],['iron','⚙️'],
  ['copper','🟤'],['coal','🖤'],['oil','🛢️'],['herbs','🌱'],['fur','🦊'],
];

function formatMats(m: Mats): string {
  const parts = MAT_ICONS
    .map(([k, icon]) => ((m[k] ?? 0) > 0 ? `${m[k]}${icon}` : null))
    .filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : '—';
}

// ─── Bâtiments ────────────────────────────────────────────────────────────────

const BUILDING_LABELS: Record<string, string> = {
  farm:       "🌾 Ferme",   mine:     "⛏️ Mine",    barracks: "⚔️ Caserne",
  market:     "🛒 Marché",  bank:     "🏦 Banque",   workshop: "🔨 Atelier",
  library:    "📚 Bibliothèque", temple: "🕍 Temple", wall:    "🧱 Rempart",
  tower:      "🗼 Tour de guet", harbor: "⚓ Port",   stable:  "🐎 Écurie",
  blacksmith: "⚒️ Forgeron", sawmill: "🪓 Scierie",  granary: "🏚️ Grenier",
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

// ─── Formulaire de transfert ──────────────────────────────────────────────────

function AmountInput({
  label, value, onChange, max,
}: { label: string; value: string; onChange: (v: string) => void; max?: number }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-amber-700 w-6">{label}</span>
      <input
        type="number"
        min="0"
        max={max}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-16 text-xs border border-amber-300 rounded px-1 py-0.5 text-amber-900 bg-white"
        placeholder="0"
      />
    </div>
  );
}

// ─── TreasuryPanel ────────────────────────────────────────────────────────────

export function TreasuryPanel({ currentUser, role, adminModeEnabled }: Props) {
  const [bank,     setBank]     = useState<PlayerBankDTO | null>(null);
  const [cities,   setCities]   = useState<CityFull[]>([]);
  const [harvests, setHarvests] = useState<Record<number, CityHarvestState>>({});
  const [loading,  setLoading]  = useState(true);

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

  // Transfert banque → ville
  const EMPTY_TRANSFER: TransferState = {
    gold: "", food: "", wood: "", stone: "", iron: "",
    copper: "", coal: "", oil: "", herbs: "", fur: "",
    cityId: "", loading: false, message: null,
  };

  const [toCity,   setToCity]   = useState<TransferState>(EMPTY_TRANSFER);
  const [toPlayer, setToPlayer] = useState<TransferState>(EMPTY_TRANSFER);

  // ─── Chargement ─────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();

      const [bankRes, citiesRes] = await Promise.allSettled([
        getPlayerBank(),
        fetch("/api/cities/me", { headers }).then(r => r.ok ? r.json() : []),
      ]);

      if (bankRes.status === "fulfilled") setBank(bankRes.value);

      const cityList: CityFull[] = citiesRes.status === "fulfilled" ? citiesRes.value : [];
      setCities(cityList);

      if (cityList.length > 0) {
        const init: Record<number, CityHarvestState> = {};
        for (const c of cityList) {
          init[c.id] = { data: null, loading: true, error: null, collecting: false, message: null };
        }
        setHarvests(init);

        const results = await Promise.allSettled(cityList.map(c => getCityHarvest(c.id)));
        setHarvests(prev => {
          const next = { ...prev };
          cityList.forEach((c, i) => {
            const r = results[i];
            next[c.id] = r.status === "fulfilled"
              ? { ...next[c.id], data: r.value, loading: false }
              : { ...next[c.id], loading: false, error: "Erreur harvest" };
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

  useEffect(() => { loadAll(); loadBankAccess(); }, [loadAll, loadBankAccess]);

  // Resynchronisation globale
  useEffect(() => {
    const handler = () => { loadAll(); loadBankAccess(); };
    window.addEventListener('nova:logistic-refresh', handler);
    return () => window.removeEventListener('nova:logistic-refresh', handler);
  }, [loadAll, loadBankAccess]);

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
      gold:   parseAmount(toCity.gold),
      food:   parseAmount(toCity.food),
      wood:   parseAmount(toCity.wood),
      stone:  parseAmount(toCity.stone),
      iron:   parseAmount(toCity.iron),
      copper: parseAmount(toCity.copper),
      coal:   parseAmount(toCity.coal),
      oil:    parseAmount(toCity.oil),
      herbs:  parseAmount(toCity.herbs),
      fur:    parseAmount(toCity.fur),
    };
    if (isNaN(cityId) || cityId < 1) {
      setToCity(prev => ({ ...prev, message: "❌ Sélectionnez une ville" }));
      return;
    }
    if (Object.values(mats).every(v => v === 0)) {
      setToCity(prev => ({ ...prev, message: "❌ Montant nul" }));
      return;
    }
    setToCity(prev => ({ ...prev, loading: true, message: null }));
    try {
      const res = await postTransferBankToCity(cityId, mats, adminModeEnabled);
      const min = res.action.minRemaining;
      const msg = adminModeEnabled
        ? `✅ Transfert immédiat vers ville (admin)`
        : `⏳ Transfert en cours — ${min} min`;
      setToCity(prev => ({ ...prev, loading: false, message: msg,
        gold: "", food: "", wood: "", stone: "", iron: "",
        copper: "", coal: "", oil: "", herbs: "", fur: "" }));
      setTimeout(() => {
        getPlayerBank().then(b => setBank(b)).catch(() => {});
        window.dispatchEvent(new CustomEvent('nova:logistic-refresh'));
      }, 300);
    } catch (err: any) {
      const raw = err.message ?? "Erreur transfert";
      let msg = `❌ ${raw}`;
      if (raw.includes("INSUFFICIENT_BANK_GOLD"))         msg = "❌ Or insuffisant en banque";
      else if (raw.includes("INSUFFICIENT_BANK_FOOD"))    msg = "❌ Nourriture insuffisante en banque";
      else if (raw.includes("INSUFFICIENT_BANK_WOOD"))    msg = "❌ Bois insuffisant en banque";
      else if (raw.includes("INSUFFICIENT_BANK_STONE"))   msg = "❌ Pierre insuffisante en banque";
      else if (raw.includes("INSUFFICIENT_BANK_IRON"))    msg = "❌ Fer insuffisant en banque";
      else if (raw.includes("INSUFFICIENT_BANK_COPPER"))  msg = "❌ Cuivre insuffisant en banque";
      else if (raw.includes("INSUFFICIENT_BANK_COAL"))    msg = "❌ Charbon insuffisant en banque";
      else if (raw.includes("INSUFFICIENT_BANK_OIL"))     msg = "❌ Pétrole insuffisant en banque";
      else if (raw.includes("INSUFFICIENT_BANK_HERBS"))   msg = "❌ Herbes insuffisantes en banque";
      else if (raw.includes("INSUFFICIENT_BANK_FUR"))     msg = "❌ Fourrure insuffisante en banque";
      else if (raw.includes("ACTION_ALREADY_ACTIVE"))     msg = "⚠️ Action déjà en cours";
      setToCity(prev => ({ ...prev, loading: false, message: msg }));
    }
  };

  // ─── Transfert banque → joueur ────────────────────────────────────────────

  const handleTransferToPlayer = async () => {
    const mats = {
      gold:   parseAmount(toPlayer.gold),
      food:   parseAmount(toPlayer.food),
      wood:   parseAmount(toPlayer.wood),
      stone:  parseAmount(toPlayer.stone),
      iron:   parseAmount(toPlayer.iron),
      copper: parseAmount(toPlayer.copper),
      coal:   parseAmount(toPlayer.coal),
      oil:    parseAmount(toPlayer.oil),
      herbs:  parseAmount(toPlayer.herbs),
      fur:    parseAmount(toPlayer.fur),
    };
    if (Object.values(mats).every(v => v === 0)) {
      setToPlayer(prev => ({ ...prev, message: "❌ Montant nul" }));
      return;
    }
    setToPlayer(prev => ({ ...prev, loading: true, message: null }));
    try {
      const res = await postTransferBankToPlayer(mats, adminModeEnabled);
      const min = res.action.minRemaining;
      const msg = adminModeEnabled
        ? "✅ Transfert immédiat sur vous (admin)"
        : `⏳ Transfert en cours — ${min} min`;
      setToPlayer(prev => ({ ...prev, loading: false, message: msg,
        gold: "", food: "", wood: "", stone: "", iron: "",
        copper: "", coal: "", oil: "", herbs: "", fur: "" }));
      setTimeout(() => {
        getPlayerBank().then(b => setBank(b)).catch(() => {});
        window.dispatchEvent(new CustomEvent('nova:logistic-refresh'));
      }, 300);
    } catch (err: any) {
      const raw = err.message ?? "Erreur transfert";
      let msg = `❌ ${raw}`;
      if (raw.includes("INSUFFICIENT_BANK_GOLD"))           msg = "❌ Or insuffisant en banque";
      else if (raw.includes("INSUFFICIENT_BANK_FOOD"))      msg = "❌ Nourriture insuffisante en banque";
      else if (raw.includes("INSUFFICIENT_BANK_WOOD"))      msg = "❌ Bois insuffisant en banque";
      else if (raw.includes("INSUFFICIENT_BANK_STONE"))     msg = "❌ Pierre insuffisante en banque";
      else if (raw.includes("INSUFFICIENT_BANK_IRON"))      msg = "❌ Fer insuffisant en banque";
      else if (raw.includes("INSUFFICIENT_BANK_COPPER"))    msg = "❌ Cuivre insuffisant en banque";
      else if (raw.includes("INSUFFICIENT_BANK_COAL"))      msg = "❌ Charbon insuffisant en banque";
      else if (raw.includes("INSUFFICIENT_BANK_OIL"))       msg = "❌ Pétrole insuffisant en banque";
      else if (raw.includes("INSUFFICIENT_BANK_HERBS"))     msg = "❌ Herbes insuffisantes en banque";
      else if (raw.includes("INSUFFICIENT_BANK_FUR"))       msg = "❌ Fourrure insuffisante en banque";
      else if (raw.includes("ACTION_ALREADY_ACTIVE"))       msg = "⚠️ Action déjà en cours";
      else if (raw.includes("TRANSPORT_CAPACITY_EXCEEDED")) msg = "❌ Capacité de transport dépassée (max 50 unités)";
      setToPlayer(prev => ({ ...prev, loading: false, message: msg }));
    }
  };

  // ─── Réseau bancaire — villes connectées ──────────────────────────────────
  // Source de vérité : city.buildings (retourné par /api/cities/me, données serveur)

  const bankCities = cities.filter(c => c.buildings?.includes('bank'));

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">

      {/* Titre + rafraîchir */}
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-base text-amber-900">🏦 Réseau Bancaire</h4>
        <button
          onClick={loadAll}
          disabled={loading}
          className="text-xs px-2 py-1 bg-amber-700 text-amber-50 rounded hover:bg-amber-600 disabled:opacity-50"
        >
          {loading ? "…" : "↻ Actualiser"}
        </button>
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
            {/* Solde — visible uniquement si présence physique confirmée */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <StatBox icon="🪙" label="Or"        value={bank.gold} />
              <StatBox icon="🌿" label="Nourriture" value={bank.food} />
              <StatBox icon="🪵" label="Bois"       value={bank.wood ?? 0} />
              <StatBox icon="🪨" label="Pierre"     value={bank.stone ?? 0} />
              <StatBox icon="⚙️" label="Fer"        value={bank.iron ?? 0} />
              <StatBox icon="🟤" label="Cuivre"     value={bank.copper ?? 0} />
              <StatBox icon="🖤" label="Charbon"    value={bank.coal ?? 0} />
              <StatBox icon="🛢️" label="Pétrole"    value={bank.oil ?? 0} />
              <StatBox icon="🌿" label="Herbes"     value={bank.herbs ?? 0} />
              <StatBox icon="🦊" label="Fourrure"   value={bank.fur ?? 0} />
            </div>
            <p className="text-xs text-amber-500 italic mb-3">
              Dépôt auto des villes connectées · Tour {bank.lastProductionTurn}
            </p>

            {/* Transférer vers une ville du réseau */}
            <div className="border-t border-amber-200 pt-2 mb-2">
              <p className="text-xs text-amber-600 font-semibold mb-2">Transférer vers une ville du réseau</p>
              {bankCities.length === 0 ? (
                <p className="text-xs text-amber-400 italic">Aucune ville connectée au réseau bancaire.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 items-end">
                  <select
                    value={toCity.cityId}
                    onChange={e => setToCity(prev => ({ ...prev, cityId: e.target.value }))}
                    className="text-xs border border-amber-300 rounded px-1 py-0.5 text-amber-900 bg-white flex-1 min-w-24"
                  >
                    <option value="">— Ville —</option>
                    {bankCities.map(c => (
                      <option key={c.id} value={String(c.id)}>{c.name}</option>
                    ))}
                  </select>
                  <AmountInput label="🪙" value={toCity.gold}   onChange={v => setToCity(p => ({ ...p, gold: v }))}   max={bank.gold} />
                  <AmountInput label="🌿" value={toCity.food}   onChange={v => setToCity(p => ({ ...p, food: v }))}   max={bank.food} />
                  <AmountInput label="🪵" value={toCity.wood}   onChange={v => setToCity(p => ({ ...p, wood: v }))}   max={bank.wood ?? 0} />
                  <AmountInput label="🪨" value={toCity.stone}  onChange={v => setToCity(p => ({ ...p, stone: v }))}  max={bank.stone ?? 0} />
                  <AmountInput label="⚙️" value={toCity.iron}   onChange={v => setToCity(p => ({ ...p, iron: v }))}   max={bank.iron ?? 0} />
                  <AmountInput label="🟤" value={toCity.copper} onChange={v => setToCity(p => ({ ...p, copper: v }))} max={bank.copper ?? 0} />
                  <AmountInput label="🖤" value={toCity.coal}   onChange={v => setToCity(p => ({ ...p, coal: v }))}   max={bank.coal ?? 0} />
                  <AmountInput label="🛢️" value={toCity.oil}    onChange={v => setToCity(p => ({ ...p, oil: v }))}    max={bank.oil ?? 0} />
                  <AmountInput label="🌱" value={toCity.herbs}  onChange={v => setToCity(p => ({ ...p, herbs: v }))}  max={bank.herbs ?? 0} />
                  <AmountInput label="🦊" value={toCity.fur}    onChange={v => setToCity(p => ({ ...p, fur: v }))}    max={bank.fur ?? 0} />
                  <button
                    onClick={handleTransferToCity}
                    disabled={toCity.loading || !toCity.cityId}
                    className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 shrink-0"
                  >
                    {toCity.loading ? "…" : "Envoyer"}
                  </button>
                </div>
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

            {/* Prendre en transport */}
            <div className="border-t border-amber-200 pt-2">
              <p className="text-xs text-amber-600 font-semibold mb-2">Prendre en transport</p>
              <div className="flex flex-wrap gap-1.5 items-end">
                <AmountInput label="🪙" value={toPlayer.gold}   onChange={v => setToPlayer(p => ({ ...p, gold: v }))}   max={bank.gold} />
                <AmountInput label="🌿" value={toPlayer.food}   onChange={v => setToPlayer(p => ({ ...p, food: v }))}   max={bank.food} />
                <AmountInput label="🪵" value={toPlayer.wood}   onChange={v => setToPlayer(p => ({ ...p, wood: v }))}   max={bank.wood ?? 0} />
                <AmountInput label="🪨" value={toPlayer.stone}  onChange={v => setToPlayer(p => ({ ...p, stone: v }))}  max={bank.stone ?? 0} />
                <AmountInput label="⚙️" value={toPlayer.iron}   onChange={v => setToPlayer(p => ({ ...p, iron: v }))}   max={bank.iron ?? 0} />
                <AmountInput label="🟤" value={toPlayer.copper} onChange={v => setToPlayer(p => ({ ...p, copper: v }))} max={bank.copper ?? 0} />
                <AmountInput label="🖤" value={toPlayer.coal}   onChange={v => setToPlayer(p => ({ ...p, coal: v }))}   max={bank.coal ?? 0} />
                <AmountInput label="🛢️" value={toPlayer.oil}    onChange={v => setToPlayer(p => ({ ...p, oil: v }))}    max={bank.oil ?? 0} />
                <AmountInput label="🌱" value={toPlayer.herbs}  onChange={v => setToPlayer(p => ({ ...p, herbs: v }))}  max={bank.herbs ?? 0} />
                <AmountInput label="🦊" value={toPlayer.fur}    onChange={v => setToPlayer(p => ({ ...p, fur: v }))}    max={bank.fur ?? 0} />
                <button
                  onClick={handleTransferToPlayer}
                  disabled={toPlayer.loading}
                  className="text-xs px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded disabled:opacity-50 shrink-0"
                >
                  {toPlayer.loading ? "…" : "Prendre"}
                </button>
              </div>
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
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-amber-900 text-sm">{city.name}</span>
                    <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs">🏦 auto</span>
                  </div>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-amber-700 mb-1.5 text-xs">
                    {(() => {
                      const perTurn: Mats = {
                        gold:   city.goldPerTurn   ?? 0,
                        food:   city.foodPerTurn   ?? 0,
                        wood:   city.woodPerTurn   ?? 0,
                        stone:  city.stonePerTurn  ?? 0,
                        iron:   city.ironPerTurn   ?? 0,
                        copper: city.copperPerTurn ?? 0,
                        coal:   city.coalPerTurn   ?? 0,
                        oil:    city.oilPerTurn    ?? 0,
                        herbs:  city.herbsPerTurn  ?? 0,
                        fur:    city.furPerTurn    ?? 0,
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

function StatBox({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="bg-white border border-amber-200 rounded p-1.5 flex items-center gap-1.5">
      <span>{icon}</span>
      <div>
        <div className="text-xs text-amber-500 leading-tight">{label}</div>
        <div className="font-bold text-amber-900 text-sm leading-tight">{value}</div>
      </div>
    </div>
  );
}
