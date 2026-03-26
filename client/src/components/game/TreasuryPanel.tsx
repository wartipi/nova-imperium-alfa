import { useState, useEffect, useCallback } from "react";
import { Package, Sparkles, Scroll, Shield, Gem, Sword } from "lucide-react";
import {
  fetchMyEconomy,
  getPlayerBank,
  getPlayerTransport,
  getCityHarvest,
  postCollectHarvest,
  postTransferBankToCity,
  postTransferBankToPlayer,
  type EconomyDTO,
  type PlayerBankDTO,
  type PlayerTransportDTO,
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

interface TransferState {
  gold:     string;
  food:     string;
  wood:     string;
  stone:    string;
  iron:     string;
  cityId:   string;
  loading:  boolean;
  message:  string | null;
}

interface Props {
  currentUser?:      string;
  role?:             string | null;
  adminModeEnabled?: boolean;
}

// ─── Slot cost par type d'objet ─────────────────────────────────────────────

const SLOT_COSTS: Record<string, number> = {
  carte:                 1,
  document:              1,
  objet_magique:         1,
  artefact:              2,
  relique:               2,
  equipement_legendaire: 2,
};

function slotCost(item: UniqueItem): number {
  return SLOT_COSTS[item.type] ?? 1;
}

const MAX_SLOTS = 5;

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

// ─── Item icon ────────────────────────────────────────────────────────────────

function ItemIcon({ type }: { type: string }) {
  const cls = "w-3 h-3 shrink-0";
  switch (type) {
    case "carte":                 return <Scroll className={cls} />;
    case "objet_magique":         return <Sparkles className={cls} />;
    case "artefact":              return <Gem className={cls} />;
    case "relique":               return <Shield className={cls} />;
    case "document":              return <Scroll className={cls} />;
    case "equipement_legendaire": return <Sword className={cls} />;
    default:                      return <Package className={cls} />;
  }
}

const RARITY_COLOR: Record<string, string> = {
  commun:     "text-gray-500",
  rare:       "text-blue-500",
  epique:     "text-purple-500",
  legendaire: "text-orange-500",
  mythique:   "text-red-500",
};

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
  const [economy,   setEconomy]   = useState<EconomyDTO | null>(null);
  const [bank,      setBank]      = useState<PlayerBankDTO | null>(null);
  const [transport, setTransport] = useState<PlayerTransportDTO | null>(null);
  const [cities,    setCities]    = useState<CityFull[]>([]);
  const [harvests,  setHarvests]  = useState<Record<number, CityHarvestState>>({});
  const [items,     setItems]     = useState<UniqueItem[]>([]);
  const [loading,   setLoading]   = useState(true);

  // Transfert banque → ville
  const [toCity, setToCity] = useState<TransferState>({
    gold: "", food: "", wood: "", stone: "", iron: "", cityId: "", loading: false, message: null,
  });

  // Transfert banque → joueur
  const [toPlayer, setToPlayer] = useState<TransferState>({
    gold: "", food: "", wood: "", stone: "", iron: "", cityId: "", loading: false, message: null,
  });

  // ─── Chargement ─────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();

      const [ecoRes, bankRes, transportRes, citiesRes, itemsRes] = await Promise.allSettled([
        fetchMyEconomy(),
        getPlayerBank(),
        getPlayerTransport(),
        fetch("/api/cities/me", { headers }).then(r => r.ok ? r.json() : []),
        fetch("/api/unique-items/me", { headers }).then(r => r.ok ? r.json() : []),
      ]);

      if (ecoRes.status       === "fulfilled") setEconomy(ecoRes.value);
      if (bankRes.status      === "fulfilled") setBank(bankRes.value);
      if (transportRes.status === "fulfilled") setTransport(transportRes.value);
      if (itemsRes.status     === "fulfilled") setItems(itemsRes.value);

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

  useEffect(() => { loadAll(); }, [loadAll]);

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
    const gold  = parseAmount(toCity.gold);
    const food  = parseAmount(toCity.food);
    const wood  = parseAmount(toCity.wood);
    const stone = parseAmount(toCity.stone);
    const iron  = parseAmount(toCity.iron);
    if (isNaN(cityId) || cityId < 1) {
      setToCity(prev => ({ ...prev, message: "❌ Sélectionnez une ville" }));
      return;
    }
    if (gold === 0 && food === 0 && wood === 0 && stone === 0 && iron === 0) {
      setToCity(prev => ({ ...prev, message: "❌ Montant nul" }));
      return;
    }
    setToCity(prev => ({ ...prev, loading: true, message: null }));
    try {
      const res = await postTransferBankToCity(cityId, { gold, food, wood, stone, iron }, adminModeEnabled);
      const min = res.action.minRemaining;
      const msg = adminModeEnabled
        ? `✅ Transfert immédiat vers ville (admin)`
        : `⏳ Transfert en cours — ${min} min`;
      setToCity(prev => ({ ...prev, loading: false, message: msg, gold: "", food: "", wood: "", stone: "", iron: "" }));
      setTimeout(() => getPlayerBank().then(b => setBank(b)).catch(() => {}), 300);
    } catch (err: any) {
      const raw = err.message ?? "Erreur transfert";
      let msg = `❌ ${raw}`;
      if (raw.includes("INSUFFICIENT_BANK_GOLD"))         msg = "❌ Or insuffisant en banque";
      else if (raw.includes("INSUFFICIENT_BANK_FOOD"))    msg = "❌ Nourriture insuffisante en banque";
      else if (raw.includes("INSUFFICIENT_BANK_WOOD"))    msg = "❌ Bois insuffisant en banque";
      else if (raw.includes("INSUFFICIENT_BANK_STONE"))   msg = "❌ Pierre insuffisante en banque";
      else if (raw.includes("INSUFFICIENT_BANK_IRON"))    msg = "❌ Fer insuffisant en banque";
      else if (raw.includes("ACTION_ALREADY_ACTIVE"))     msg = "⚠️ Action déjà en cours";
      setToCity(prev => ({ ...prev, loading: false, message: msg }));
    }
  };

  // ─── Transfert banque → joueur ────────────────────────────────────────────

  const handleTransferToPlayer = async () => {
    const gold  = parseAmount(toPlayer.gold);
    const food  = parseAmount(toPlayer.food);
    const wood  = parseAmount(toPlayer.wood);
    const stone = parseAmount(toPlayer.stone);
    const iron  = parseAmount(toPlayer.iron);
    if (gold === 0 && food === 0 && wood === 0 && stone === 0 && iron === 0) {
      setToPlayer(prev => ({ ...prev, message: "❌ Montant nul" }));
      return;
    }
    setToPlayer(prev => ({ ...prev, loading: true, message: null }));
    try {
      const res = await postTransferBankToPlayer({ gold, food, wood, stone, iron }, adminModeEnabled);
      const min = res.action.minRemaining;
      const msg = adminModeEnabled
        ? "✅ Transfert immédiat sur vous (admin)"
        : `⏳ Transfert en cours — ${min} min`;
      setToPlayer(prev => ({ ...prev, loading: false, message: msg, gold: "", food: "", wood: "", stone: "", iron: "" }));
      setTimeout(() => {
        getPlayerBank().then(b => setBank(b)).catch(() => {});
        getPlayerTransport().then(t => setTransport(t)).catch(() => {});
      }, 300);
    } catch (err: any) {
      const raw = err.message ?? "Erreur transfert";
      let msg = `❌ ${raw}`;
      if (raw.includes("INSUFFICIENT_BANK_GOLD"))           msg = "❌ Or insuffisant en banque";
      else if (raw.includes("INSUFFICIENT_BANK_FOOD"))      msg = "❌ Nourriture insuffisante en banque";
      else if (raw.includes("INSUFFICIENT_BANK_WOOD"))      msg = "❌ Bois insuffisant en banque";
      else if (raw.includes("INSUFFICIENT_BANK_STONE"))     msg = "❌ Pierre insuffisante en banque";
      else if (raw.includes("INSUFFICIENT_BANK_IRON"))      msg = "❌ Fer insuffisant en banque";
      else if (raw.includes("ACTION_ALREADY_ACTIVE"))       msg = "⚠️ Action déjà en cours";
      else if (raw.includes("TRANSPORT_CAPACITY_EXCEEDED")) msg = "❌ Capacité de transport dépassée (max 50 unités)";
      setToPlayer(prev => ({ ...prev, loading: false, message: msg }));
    }
  };

  // ─── Calcul slots objets uniques ─────────────────────────────────────────

  const usedSlots = items.reduce((sum, item) => sum + slotCost(item), 0);
  const remainingSlots = Math.max(0, MAX_SLOTS - usedSlots);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">

      {/* Titre + rafraîchir */}
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

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 1 — Inventaire de transport
      ════════════════════════════════════════════════════════════════════ */}
      <Section title="🎒 Inventaire de Transport">

        {/* Transport de ressources */}
        {transport && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-amber-700 font-medium">Ressources portées</span>
              <span className={[
                "font-bold text-xs",
                transport.usedUnits >= transport.maxUnits ? "text-red-600" : "text-green-700"
              ].join(" ")}>
                {transport.usedUnits} / {transport.maxUnits} unités · {transport.freeUnits} libres
              </span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-amber-700">
              <span>🪙 {transport.gold} or</span>
              <span>🌿 {transport.food} nourriture</span>
              {(transport.wood > 0 || transport.stone > 0 || transport.iron > 0) && (<>
                <span>🪵 {transport.wood} bois</span>
                <span>🪨 {transport.stone} pierre</span>
                <span>⚙️ {transport.iron} fer</span>
              </>)}
            </div>
            {transport.usedUnits >= transport.maxUnits && (
              <p className="text-xs text-red-600 font-semibold mt-0.5">⚠️ Sac plein</p>
            )}
          </div>
        )}

        {/* Objets uniques */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-amber-700 font-medium">Objets uniques</span>
            <span className={[
              "font-bold",
              usedSlots >= MAX_SLOTS ? "text-red-600" : usedSlots > MAX_SLOTS * 0.6 ? "text-orange-600" : "text-green-700"
            ].join(" ")}>
              {usedSlots} / {MAX_SLOTS} slots · {remainingSlots} libres
            </span>
          </div>
          <div className="flex gap-1 mb-1">
            {Array.from({ length: MAX_SLOTS }).map((_, i) => (
              <div
                key={i}
                className={[
                  "h-3 flex-1 rounded-sm border transition-colors",
                  i < usedSlots
                    ? usedSlots >= MAX_SLOTS ? "bg-red-400 border-red-500" : "bg-amber-500 border-amber-600"
                    : "bg-amber-100 border-amber-300",
                ].join(" ")}
              />
            ))}
          </div>
        </div>

        {items.length === 0 ? (
          <p className="text-xs text-amber-400 italic">Aucun objet porté.</p>
        ) : (
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {items.map(item => {
              const cost = slotCost(item);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-xs bg-amber-50 border border-amber-200 rounded p-1.5"
                  title={item.description}
                >
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className={RARITY_COLOR[item.rarity] ?? "text-gray-500"}>
                      <ItemIcon type={item.type} />
                    </span>
                    <span className="text-amber-900 truncate">{item.name}</span>
                    <span className="text-amber-400 shrink-0">({item.rarity})</span>
                  </div>
                  <span className={[
                    "font-semibold text-xs px-1 rounded shrink-0",
                    cost > 1 ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"
                  ].join(" ")}>
                    {cost} slot{cost > 1 ? "s" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-xs text-amber-400 italic mt-1">
          Capacité transport : 50 unités totales (or + nourriture).
        </p>
        {currentUser && currentUser !== 'player' && (
          <p className="text-xs text-amber-400 mt-1">Joueur : {currentUser}</p>
        )}
      </Section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 2 — Banque Personnelle + Transferts
      ════════════════════════════════════════════════════════════════════ */}
      <Section title="🏦 Banque Personnelle & Transferts">
        {bank ? (
          <>
            {/* Solde */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <StatBox icon="🪙" label="Or en banque"    value={bank.gold} />
              <StatBox icon="🌿" label="Nour. en banque"  value={bank.food} />
              <StatBox icon="🪵" label="Bois en banque"   value={bank.wood ?? 0} />
              <StatBox icon="🪨" label="Pierre en banque" value={bank.stone ?? 0} />
              <StatBox icon="⚙️" label="Fer en banque"   value={bank.iron ?? 0} />
            </div>
            <p className="text-xs text-amber-500 italic mb-3">
              Dépôt auto des villes avec banque · Tour {bank.lastProductionTurn}
            </p>

            {/* Séparateur */}
            <div className="border-t border-amber-200 pt-2 mb-2">
              <p className="text-xs text-amber-600 font-semibold mb-2">Transférer vers une ville</p>
              <div className="flex flex-wrap gap-1.5 items-end">
                <select
                  value={toCity.cityId}
                  onChange={e => setToCity(prev => ({ ...prev, cityId: e.target.value }))}
                  className="text-xs border border-amber-300 rounded px-1 py-0.5 text-amber-900 bg-white flex-1 min-w-24"
                >
                  <option value="">— Ville —</option>
                  {cities.map(c => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
                <AmountInput label="🪙" value={toCity.gold}  onChange={v => setToCity(p => ({ ...p, gold: v }))}  max={bank.gold} />
                <AmountInput label="🌿" value={toCity.food}  onChange={v => setToCity(p => ({ ...p, food: v }))}  max={bank.food} />
                <AmountInput label="🪵" value={toCity.wood}  onChange={v => setToCity(p => ({ ...p, wood: v }))}  max={bank.wood ?? 0} />
                <AmountInput label="🪨" value={toCity.stone} onChange={v => setToCity(p => ({ ...p, stone: v }))} max={bank.stone ?? 0} />
                <AmountInput label="⚙️" value={toCity.iron}  onChange={v => setToCity(p => ({ ...p, iron: v }))}  max={bank.iron ?? 0} />
                <button
                  onClick={handleTransferToCity}
                  disabled={toCity.loading || !toCity.cityId}
                  className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 shrink-0"
                >
                  {toCity.loading ? "…" : "Envoyer"}
                </button>
              </div>
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

            <div className="border-t border-amber-200 pt-2">
              <p className="text-xs text-amber-600 font-semibold mb-2">
                Prendre en transport
                {transport && <span className="text-amber-400 font-normal ml-1">(libre : {transport.freeUnits} unités)</span>}
              </p>
              <div className="flex flex-wrap gap-1.5 items-end">
                <AmountInput label="🪙" value={toPlayer.gold}  onChange={v => setToPlayer(p => ({ ...p, gold: v }))}  max={bank.gold} />
                <AmountInput label="🌿" value={toPlayer.food}  onChange={v => setToPlayer(p => ({ ...p, food: v }))}  max={bank.food} />
                <AmountInput label="🪵" value={toPlayer.wood}  onChange={v => setToPlayer(p => ({ ...p, wood: v }))}  max={bank.wood ?? 0} />
                <AmountInput label="🪨" value={toPlayer.stone} onChange={v => setToPlayer(p => ({ ...p, stone: v }))} max={bank.stone ?? 0} />
                <AmountInput label="⚙️" value={toPlayer.iron}  onChange={v => setToPlayer(p => ({ ...p, iron: v }))}  max={bank.iron ?? 0} />
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
          SECTION 3 — Villes (production + harvest + collecte)
      ════════════════════════════════════════════════════════════════════ */}
      <Section title={`🏘️ Villes (${cities.length})`}>
        {loading && cities.length === 0 ? (
          <p className="text-xs text-amber-500">Chargement…</p>
        ) : cities.length === 0 ? (
          <p className="text-xs text-amber-400 italic">Aucune ville dans votre faction.</p>
        ) : (
          <div className="space-y-2.5">
            {cities.map(city => {
              const h = harvests[city.id];
              return (
                <div key={city.id} className="bg-white border border-amber-200 rounded p-2.5 text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-amber-900 text-sm">{city.name}</span>
                    {h?.data?.hasBank && (
                      <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs">🏦 auto</span>
                    )}
                  </div>
                  <div className="flex gap-3 text-amber-700 mb-1.5">
                    <span>+{city.goldPerTurn ?? 0}🪙/tour</span>
                    <span>+{city.foodPerTurn ?? 0}🌿/tour</span>
                    <BuildingsTooltip buildings={city.buildings ?? []} />
                  </div>
                  {h && !h.loading && !h.error && h.data && (
                    <div className="space-y-1 border-t border-amber-100 pt-1.5">
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-amber-600">
                        <span>⏳ {h.data.pending.gold}🪙 {h.data.pending.food}🌿
                          {(h.data.pending.wood > 0 || h.data.pending.stone > 0 || h.data.pending.iron > 0) && <> {h.data.pending.wood}🪵 {h.data.pending.stone}🪨 {h.data.pending.iron}⚙️</>}
                          {" "}(pending)
                        </span>
                        <span>📦 {h.data.inventory.gold}🪙 {h.data.inventory.food}🌿
                          {(h.data.inventory.wood > 0 || h.data.inventory.stone > 0 || h.data.inventory.iron > 0) && <> {h.data.inventory.wood}🪵 {h.data.inventory.stone}🪨 {h.data.inventory.iron}⚙️</>}
                          {" "}(stock)
                        </span>
                      </div>
                      {!h.data.hasBank && (
                        <button
                          onClick={() => handleCollect(city.id)}
                          disabled={h.collecting || (h.data.pending.gold === 0 && h.data.pending.food === 0 && h.data.pending.wood === 0 && h.data.pending.stone === 0 && h.data.pending.iron === 0)}
                          className={[
                            "px-2 py-0.5 rounded text-xs font-semibold transition",
                            h.collecting || (h.data.pending.gold === 0 && h.data.pending.food === 0 && h.data.pending.wood === 0 && h.data.pending.stone === 0 && h.data.pending.iron === 0)
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-amber-500 hover:bg-amber-600 text-white",
                          ].join(" ")}
                        >
                          {h.collecting ? "⏳…" : "🚜 Collecter"}
                        </button>
                      )}
                      {h.message && <p className="text-amber-700 font-medium">{h.message}</p>}
                    </div>
                  )}
                  {h?.loading && <p className="text-amber-400 text-xs">Chargement harvest…</p>}
                  {h?.error && <p className="text-red-400 text-xs">{h.error}</p>}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 4 — Réserves de faction (données legacy — non alimentées automatiquement)
          La production des villes alimente désormais player_bank ou city_pending_harvest.
          Cette section est conservée pour compatibilité future (gouvernements de faction).
      ════════════════════════════════════════════════════════════════════ */}
      {economy && (
        <Section title="📊 Réserves de Faction (inactif)">
          <p className="text-xs text-amber-500 italic mb-2">
            Non alimenté par la production des villes — réservé au futur système de gouvernement.
          </p>
          <div className="grid grid-cols-2 gap-2 mb-1 opacity-50">
            <StatBox icon="💰" label="Or faction"    value={economy.gold} />
            <StatBox icon="🌾" label="Nour. faction" value={economy.food} />
            <StatBox icon="📈" label="+Or/tour"      value={`+${economy.goldPerTurn}`} />
            <StatBox icon="📈" label="+Nour./tour"   value={`+${economy.foodPerTurn}`} />
          </div>
        </Section>
      )}

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
