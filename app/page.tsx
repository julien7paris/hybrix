"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  WagmiProvider,
  createConfig,
  http,
  useAccount,
  useConnect,
  useDisconnect,
  useWriteContract,
  useReadContract,
} from "wagmi";
import { polygonAmoy } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Abi } from "viem";
import { motion } from "framer-motion";
import { parseEther } from "viem";

/* ---------- Types ---------- */
type Address = `0x${string}`;
interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}
function getEthereum(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  const eth = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
  return eth;
}
interface Talent {
  id: number;
  name: string;
  skills: string[]; // compétences techniques
  rate: number; // €/h
  rating: number; // 0-5
  location: string; // ville/pays
  categories: string[]; // catégories IA
  sectors: string[]; // secteurs visés
}
type MissionStatus = "open" | "closed";
interface Mission {
  id: number;
  title: string;
  budget: number;
  desc: string;
  status: MissionStatus;
}

/* ---------- Providers & config ---------- */
const queryClient = new QueryClient();

const ESCROW_ADDRESS: Address =
  ((process.env.NEXT_PUBLIC_ESCROW_ADDRESS as Address | undefined) ??
    ("0x0000000000000000000000000000000000000000" as Address)) as Address;

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || undefined;

const config = createConfig({
  chains: [polygonAmoy],
  connectors: [injected({ target: "metaMask" })],
  transports: {
    // Fallback RPC public Amoy si la variable d'env est absente
    [polygonAmoy.id]: http(rpcUrl ?? polygonAmoy.rpcUrls.default.http[0]),
  },
});

const escrowAbi = [
  {
    type: "function",
    name: "createDeal",
    stateMutability: "nonpayable",
    inputs: [
      { name: "talent", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "function",
    name: "fundDeal",
    stateMutability: "payable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "release",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "nextId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const satisfies Abi;

/* ---------- Taxonomies ---------- */
const IA_CATEGORIES = [
  "Support Client",
  "Assistance Métier",
  "Marketing",
  "Analyse & Conseil",
  "Production de Contenu",
] as const;

const SKILLS = [
  "UX / UI Design",
  "Développement Web3 / Solidity",
  "DevOps & Automatisation",
  "Data Analyse & Data Science",
  "Cybersécurité",
  "Fintech",
  "Prompt Engineering",
  "Cloud & Edge Computing",
  "IoT & Web3",
] as const;

const SECTORS = [
  "E-commerce",
  "Industrie",
  "Formation",
  "Santé",
  "Médias",
  "Finance",
  "Tourisme",
  "Énergie",
] as const;

const LOCATIONS = [
  "Paris, FR",
  "Lyon, FR",
  "Marseille, FR",
  "Bruxelles, BE",
  "Genève, CH",
  "Remote",
] as const;

/* ---------- Données démo ---------- */
const seedTalent: Talent[] = [
  {
    id: 1,
    name: "Alice Martin",
    skills: ["Prompt Engineering", "Data Analyse & Data Science"],
    rate: 65,
    rating: 4.8,
    location: "Paris, FR",
    categories: ["Analyse & Conseil", "Production de Contenu"],
    sectors: ["Finance", "E-commerce"],
  },
  {
    id: 2,
    name: "Bilal Cohen",
    skills: ["Fintech", "Développement Web3 / Solidity"],
    rate: 85,
    rating: 4.7,
    location: "Lyon, FR",
    categories: ["Assistance Métier"],
    sectors: ["Finance", "Industrie"],
  },
  {
    id: 3,
    name: "Chloé Dubois",
    skills: ["UX / UI Design", "DevOps & Automatisation"],
    rate: 55,
    rating: 4.6,
    location: "Remote",
    categories: ["Support Client", "Marketing"],
    sectors: ["E-commerce", "Médias"],
  },
];

const sampleMissions: Mission[] = [
  { id: 101, title: "Audit data + dashboard P&L", budget: 1800, desc: "Nettoyage data + P&L mensuel.", status: "open" },
  { id: 102, title: "Agent IA service client", budget: 1200, desc: "Scripts + intégration helpdesk.", status: "open" },
];

/* ---------- Utils ---------- */
function errorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const anyErr = err as { shortMessage?: string; message?: string };
    return anyErr.shortMessage || anyErr.message || "Erreur";
  }
  return "Erreur";
}

/* ---------- Animations ---------- */
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeCard = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

/* ---------- UI ---------- */
function HeaderBar() {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between py-4 px-6 backdrop-blur-xl bg-white/10 rounded-2xl border border-white/15">
      <div className="font-extrabold text-xl tracking-tight text-white">HybriX</div>
      <WalletControls />
    </div>
  );
}

function WalletControls() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, status, error } = useConnect();
  const { disconnect } = useDisconnect();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const eth = mounted ? getEthereum() : undefined;

  const injectedConnector =
    mounted && connectors?.find?.((c) => c.id === "injected" || c.name.toLowerCase().includes("metamask"));

  const tryConnect = async () => {
    try {
      if (injectedConnector) return void (await connect({ connector: injectedConnector }));
      if (eth) return void (await eth.request({ method: "eth_requestAccounts" }));
      window.open("https://metamask.io/download/", "_blank");
    } catch (e) {
      alert(errorMessage(e));
    }
  };

  return (
    <div className="flex items-center gap-3 text-sm text-white">
      {/* Adresse visible si connecté */}
      {isConnected && (
        <span className="px-3 py-1 rounded-full bg-emerald-600 text-white" suppressHydrationWarning>
          {`${address?.slice(0, 6)}…${address?.slice(-4)}`}
        </span>
      )}

      {/* Bouton connecter/déconnecter toujours présent et bien visible */}
      {!isConnected ? (
        <button
          className="px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-700 text-white shadow-lg hover:opacity-90 transition"
          onClick={tryConnect}
        >
          Connecter
        </button>
      ) : (
        <button
          className="px-4 py-1.5 rounded-full bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg hover:opacity-90 transition"
          onClick={() => disconnect()}
        >
          Déconnecter
        </button>
      )}

      {/* plus d'indication réseau */}
      {status === "error" && <span className="text-red-300">{error?.message}</span>}
    </div>
  );
}

function Hero() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      className="text-center py-16 text-white"
    >
      <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
        Hybrid Talent Marketplace
      </h1>
      <p className="text-white/80 max-w-3xl mx-auto mt-4">
        Missions réalisées par des duos <b>IA + Expert Humain</b>.
      </p>
      <div className="flex justify-center gap-4 mt-6">
        <a href="#post" className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium shadow-lg hover:opacity-90 transition">
          Publier une Mission
        </a>
        <a href="#find" className="px-6 py-3 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-medium shadow-lg hover:opacity-90 transition">
          Trouver un Binôme
        </a>
        <a href="#register" className="px-6 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-700 text-white font-medium shadow-lg hover:opacity-90 transition">
          Devenir talent
        </a>
      </div>
      <div className="mt-3 text-sm text-white/60">
        La communauté des binômes IA + Experts qui transforment vos idées en succès.
      </div>
    </motion.div>
  );
}

/* ---------- Filtres + liste talents ---------- */
function FindTalent({ talents, onPropose }: { talents: Talent[]; onPropose: (name: string) => void }) {
  const [category, setCategory] = useState<string>("");
  const [skill, setSkill] = useState<string>("");
  const [sector, setSector] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [resetNonce, setResetNonce] = useState(0); // pour forcer le remount des selects si besoin
  const [listKey, setListKey] = useState(0); // pour remonter la liste visuelle au reset

  const list = useMemo(() => {
    const c = (category || "").trim();
    const sk = (skill || "").trim();
    const se = (sector || "").trim();
    const lo = (location || "").trim();
    return talents.filter((t) => {
      const okCategory = c ? t.categories.includes(c) : true;
      const okSkill = sk ? t.skills.includes(sk) : true;
      const okSector = se ? t.sectors.includes(se) : true;
      const okLocation = lo ? t.location === lo : true;
      return okCategory && okSkill && okSector && okLocation;
    });
  }, [talents, category, skill, sector, location]);

  const handleReset = () => {
    setCategory("");
    setSkill("");
    setSector("");
    setLocation("");
    setResetNonce((n) => n + 1); // garantit un rerender des selects
    setListKey((k) => k + 1); // remonte le conteneur de liste
  };

  return (
    <motion.section
      id="find"
      key={resetNonce} // remonte toute la section au reset
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ amount: 0.2 }}
      className="grid md:grid-cols-3 gap-5"
    >
      {/* Bloc filtres à gauche */}
      <motion.div variants={fadeCard}
        className="md:col-span-1 p-5 rounded-3xl border border-white/15 bg-white/5 backdrop-blur-xl">
        <div className="text-white/90 font-semibold mb-3">Rechercher</div>
        <div className="grid grid-rows-5 gap-3 min-h-[360px]">
          <FilterSelect label="Catégorie IA" value={category} onChange={setCategory} options={["", ...IA_CATEGORIES]} />
          <FilterSelect label="Compétences de l'Expert" value={skill} onChange={setSkill} options={["", ...SKILLS]} />
          <FilterSelect label="Secteur visé" value={sector} onChange={setSector} options={["", ...SECTORS]} />
          <FilterSelect label="Localisation" value={location} onChange={setLocation} options={["", ...LOCATIONS]} />
          <div className="flex items-center justify-between">
            <button
              className="px-3 py-1.5 rounded-full border border-white/25 text-white/90 hover:bg-white/10"
              onClick={handleReset}
            >
              Réinitialiser
            </button>
            <span className="text-xs text-white/70">{list.length} profils</span>
          </div>
        </div>
      </motion.div>

      {/* Liste talents à droite */}
      <div key={listKey} className="md:col-span-2 grid gap-4">
        {list.map((t) => (
          <motion.div
            key={t.id}
            variants={fadeCard}
            initial={false} // évite de rester caché quand la liste se remonte
            className="rounded-3xl border border-white/15 p-4 bg-white/5 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-white">{t.name}</span>
              <div className="flex gap-2 items-center text-sm">
                <span className="px-2 py-0.5 bg-purple-800 text-white rounded">{t.rating.toFixed(1)}★</span>
                <span className="px-2 py-0.5 border border-white/20 text-white rounded">{t.rate} €/h</span>
              </div>
            </div>
            <div className="mt-1 text-xs text-white/70">{t.location} • {t.categories.join(" · ")} • {t.sectors.join(" · ")}</div>
            <div className="mt-2 flex gap-2 flex-wrap text-xs">
              {t.skills.map((s) => (
                <span key={s} className="px-2 py-0.5 rounded bg-purple-800 text-white">
                  {s}
                </span>
              ))}
            </div>
            <div className="mt-3">
              <button
                className="px-3 py-1.5 rounded-full bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white hover:opacity-90 transition"
                onClick={() => onPropose(t.name)}
              >
                Proposer une mission
              </button>
            </div>
          </motion.div>
        ))}
        {list.length === 0 && (
          <div className="text-white/70 text-sm">Aucun profil ne correspond à ces filtres.</div>
        )}
      </div>
    </motion.section>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] | string[]; }) {
  return (
    <label className="flex flex-col justify-between">
      <div className="text-sm text-white/80 mb-1">{label}</div>
      <select
        className="w-full h-11 border border-white/20 bg-purple-900/30 text-white rounded px-3 outline-none focus:ring-2 focus:ring-purple-400"
        value={value}
        onChange={(e) => onChange((e.target.value || "").trim())}
      >
        {/* valeur vide explicite pour Indifférent */}
        <option value="" className="bg-indigo-950">Indifférent</option>
        {options
          .filter((opt) => opt !== "")
          .map((opt) => (
            <option key={opt as string} value={opt as string} className="bg-indigo-950">
              {opt as string}
            </option>
          ))}
      </select>
    </label>
  );
}

/* ---------- RegisterTalent ---------- */
function RegisterTalent({ onRegister }: { onRegister: (t: Talent) => void }) {
  const [name, setName] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [rate, setRate] = useState("");
  const [location, setLocation] = useState<string>("Remote");
  const [categories, setCategories] = useState<string[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);

  const toggleArr = (arr: string[], setter: (v: string[]) => void, v: string) => {
    setter(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };

  const submit = () => {
    if (!name || !rate) return alert("Nom et TJM requis");
    const talent: Talent = {
      id: Date.now(),
      name,
      skills,
      rate: Number(rate),
      rating: 4.6,
      location,
      categories,
      sectors,
    };
    onRegister(talent);
    setName(""); setSkills([]); setRate(""); setLocation("Remote"); setCategories([]); setSectors([]);
    alert("Profil talent créé !");
  };

  return (
    <motion.section
      id="register"
      variants={fadeCard}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      className="rounded-3xl border border-white/15 bg-white/5 backdrop-blur-xl p-5"
    >
      <div className="font-semibold mb-3 text-white/90">Devenir talent</div>
      <div className="grid md:grid-cols-3 gap-3">
        <input
          className="border border-white/20 bg-purple-900/30 text-white rounded px-3 py-2 placeholder-white/50"
          placeholder="Nom complet"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select className="border border-white/20 bg-purple-900/30 text-white rounded px-3 py-2" value={location} onChange={(e) => setLocation(e.target.value)}>
          {LOCATIONS.map((l) => (
            <option key={l} value={l} className="bg-indigo-950">{l}</option>
          ))}
        </select>
        <input
          type="number"
          inputMode="decimal"
          className="border border-white/20 bg-purple-900/30 text-white rounded px-3 py-2"
          placeholder="TJM (€ / h)"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />

        <div className="md:col-span-3">
          <div className="text-sm text-white/80 mb-1">Compétences</div>
          <div className="flex flex-wrap gap-2">
            {SKILLS.map((s) => (
              <button key={s} type="button"
                className={`px-2 py-1 rounded-full border ${skills.includes(s as string) ? "bg-purple-700 border-purple-500" : "border-white/25"}`}
                onClick={() => toggleArr(skills, setSkills, s as string)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-3">
          <div className="text-sm text-white/80 mb-1">Catégories IA</div>
          <div className="flex flex-wrap gap-2">
            {IA_CATEGORIES.map((c) => (
              <button key={c} type="button"
                className={`px-2 py-1 rounded-full border ${categories.includes(c as string) ? "bg-purple-700 border-purple-500" : "border-white/25"}`}
                onClick={() => toggleArr(categories, setCategories, c as string)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-3">
          <div className="text-sm text-white/80 mb-1">Secteurs visés</div>
          <div className="flex flex-wrap gap-2">
            {SECTORS.map((s) => (
              <button key={s} type="button"
                className={`px-2 py-1 rounded-full border ${sectors.includes(s as string) ? "bg-purple-700 border-purple-500" : "border-white/25"}`}
                onClick={() => toggleArr(sectors, setSectors, s as string)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3">
        <button
          className="px-5 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-700 text-white hover:opacity-90 transition"
          onClick={submit}
        >
          S’inscrire comme talent
        </button>
      </div>
      <p className="text-xs text-white/60 mt-2">
        MVP: les profils sont gardés en mémoire côté client. En prod, brancher une DB + auth.
      </p>
    </motion.section>
  );
}

/* ---------- PostMission ---------- */
function PostMission({ onCreate }: { onCreate: (m: Mission) => void }) {
  const [title, setTitle] = useState("");
  const [budget, setBudget] = useState("");
  const [desc, setDesc] = useState("");

  return (
    <motion.section
      id="post"
      variants={fadeCard}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      className="rounded-3xl border border-white/15 bg-white/5 backdrop-blur-xl p-5"
    >
      <div className="font-semibold mb-3 text-white/90">Publier une mission</div>
      <div className="grid md:grid-cols-3 gap-3">
        <input
          className="border border-white/20 bg-purple-900/30 text-white rounded px-3 py-2 placeholder-white/50 outline-none focus:ring-2 focus:ring-purple-400"
          placeholder="Titre"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="number"
          inputMode="decimal"
          className="border border-white/20 bg-purple-900/30 text-white rounded px-3 py-2 placeholder-white/50 outline-none focus:ring-2 focus:ring-purple-400"
          placeholder="Budget (€)"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
        />
        <input
          className="border border-white/20 bg-purple-900/30 text-white rounded px-3 py-2 md:col-span-3 placeholder-white/50 outline-none focus:ring-2 focus:ring-purple-400"
          placeholder="Description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </div>
      <div className="mt-3">
        <button
          className="px-5 py-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg hover:opacity-90 transition"
          onClick={() => {
            if (!title || !budget) {
              alert("Complète le titre et le budget");
              return;
            }
            const m: Mission = {
              id: Date.now(),
              title,
              budget: Number(budget),
              desc,
              status: "open",
            };
            onCreate(m);
            setTitle(""); setBudget(""); setDesc("");
          }}
        >
          Créer
        </button>
      </div>
    </motion.section>
  );
}

/* ---------- Contracts (escrow) ---------- */
function Contracts() {
  const { isConnected } = useAccount();
  const [talent, setTalent] = useState<string>("");
  const [amountEth, setAmountEth] = useState<string>("");
  const [dealId, setDealId] = useState<string>("");

  const { writeContractAsync } = useWriteContract();
  const { data: nextId } = useReadContract({
    abi: escrowAbi,
    address: ESCROW_ADDRESS,
    functionName: "nextId",
  });

  return (
    <motion.section
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      className="grid md:grid-cols-2 gap-5"
    >
      {/* Créer un deal */}
      <motion.div variants={fadeCard}
        className="rounded-3xl border border-white/15 bg-white/5 backdrop-blur-xl p-5">
        <div className="font-semibold mb-2 text-white/90">Créer un deal (client → talent)</div>
        <input
          className="border border-white/20 bg-purple-900/30 text-white rounded px-3 py-2 w-full mb-2 placeholder-white/50 outline-none focus:ring-2 focus:ring-purple-400"
          placeholder="Adresse du talent (0x...)"
          value={talent}
          onChange={(e) => setTalent(e.target.value)}
        />
        <input
          type="number"
          inputMode="decimal"
          className="border border-white/20 bg-purple-900/30 text-white rounded px-3 py-2 w-full mb-2 placeholder-white/50 outline-none focus:ring-2 focus:ring-purple-400"
          placeholder="Montant en ETH (testnet)"
          value={amountEth}
          onChange={(e) => setAmountEth(e.target.value)}
        />
        <div className="text-xs text-white/70 mb-3">
          Prochain ID estimé: <span className="px-2 py-0.5 rounded bg-gray-900 text-gray-100">{String(nextId ?? "?")}</span>
        </div>
        <button
          disabled={!isConnected || !talent || !amountEth}
          className="px-5 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-700 text-white disabled:opacity-50"
          onClick={async () => {
            try {
              await writeContractAsync({
                abi: escrowAbi,
                address: ESCROW_ADDRESS,
                functionName: "createDeal",
                args: [talent as Address, parseEther(amountEth || "0")],
              });
              alert("Deal créé. Utilise l'ID = nextId - 1.");
            } catch (e) {
              alert(errorMessage(e));
            }
          }}
        >
          Créer
        </button>
      </motion.div>

      {/* Financer & Libérer */}
      <motion.div variants={fadeCard}
        className="rounded-3xl border border-white/15 bg-white/5 backdrop-blur-xl p-5">
        <div className="font-semibold mb-2 text-white/90">Financer & Libérer</div>
        <input
          type="number"
          inputMode="numeric"
          className="border border-white/20 bg-purple-900/30 text-white rounded px-3 py-2 w-full mb-2 placeholder-white/50 outline-none focus:ring-2 focus:ring-purple-400"
          placeholder="ID du deal"
          value={dealId}
          onChange={(e) => setDealId(e.target.value)}
        />
        <input
          type="number"
          inputMode="decimal"
          className="border border-white/20 bg-purple-900/30 text-white rounded px-3 py-2 w-full mb-2 placeholder-white/50 outline-none focus:ring-2 focus:ring-purple-400"
          placeholder="Montant en ETH (pour financer)"
          value={amountEth}
          onChange={(e) => setAmountEth(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            disabled={!isConnected || !dealId || !amountEth}
            className="px-5 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-700 text-white disabled:opacity-50"
            onClick={async () => {
              try {
                await writeContractAsync({
                  abi: escrowAbi,
                  address: ESCROW_ADDRESS,
                  functionName: "fundDeal",
                  args: [BigInt(dealId)],
                  value: parseEther(amountEth || "0"),
                });
                alert("Financé");
              } catch (e) {
                alert(errorMessage(e));
              }
            }}
          >
            Financer
          </button>
          <button
            disabled={!isConnected || !dealId}
            className="px-5 py-2 rounded-full border border-white/25 text-white disabled:opacity-50 hover:bg-white/10 transition"
            onClick={async () => {
              try {
                await writeContractAsync({
                  abi: escrowAbi,
                  address: ESCROW_ADDRESS,
                  functionName: "release",
                  args: [BigInt(dealId)],
                });
                alert("Libéré au talent");
              } catch (e) {
                alert(errorMessage(e));
              }
            }}
          >
            Libérer
          </button>
        </div>
        <p className="text-xs text-white/60 mt-2">Pour la prod : passer en USDC + jalons multiples.</p>
      </motion.div>
    </motion.section>
  );
}

/* ---------- Domains / Thèmes ---------- */
function DomainsSection() {
  const domains = [
    "Data & Analytics",
    "Marketing",
    "Design",
    "Juridique & Conformité",
    "Support Client",
    "Finance",
    "Santé",
    "Ressources Humaines",
    "Cybersécurité",
    "Recherche",
    "Industrie",
    "Médias",
  ];

  return (
    <motion.section
      id="domains"
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      className="rounded-3xl border border-white/15 bg-white/5 backdrop-blur-xl p-6 md:p-8"
    >
      <motion.h2 variants={fadeCard} className="text-xl md:text-2xl font-semibold text-white/90 mb-5">
        Thèmes couverts
      </motion.h2>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        {domains.map((label) => (
          <motion.div
            key={label}
            variants={fadeCard}
            className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white/90"
          >
            {label}
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

/* ---------- Page ---------- */
export default function Page() {
  const [missions, setMissions] = useState<Mission[]>(sampleMissions);
  const [talents, setTalents] = useState<Talent[]>(seedTalent);
  const addMission = (m: Mission) => setMissions((prev) => [m, ...prev]);
  const addTalent = (t: Talent) => setTalents((prev) => [t, ...prev]);

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <main className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-black text-white p-6 md:p-8 relative overflow-hidden">
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-[420px] w-[420px] rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="max-w-6xl mx-auto space-y-10">
            <HeaderBar />
            <Hero />

            <motion.section
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              className="space-y-6"
            >
              {/* Filtres + Talents */}
              <FindTalent talents={talents} onPropose={(name) => alert(`Proposer une mission à ${name}`)} />

              {/* Missions ouvertes */}
              <motion.div variants={fadeCard}
                className="rounded-3xl border border-white/15 bg-white/5 backdrop-blur-xl p-5">
                <h3 className="font-semibold text-white/90 mb-3">Missions ouvertes</h3>
                <div className="grid gap-3">
                  {missions.map((m) => (
                    <div key={m.id} className="rounded-2xl border border-white/15 bg-white/5 p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{m.title}</span>
                        <span className="px-2 py-0.5 rounded bg-gray-900 text-gray-100 text-sm">
                          Budget {m.budget} €
                        </span>
                      </div>
                      <p className="text-sm text-white/80 mt-1">{m.desc}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Formulaire + Escrow */}
              <PostMission onCreate={addMission} />
              <Contracts />

              {/* Inscription Talent */}
              <RegisterTalent onRegister={addTalent} />
            </motion.section>

            {/* Thèmes couverts */}
            <DomainsSection />

            <footer className="text-xs text-white/60 pt-8">
              © {new Date().getFullYear()} HybriX — MVP testnet. Adresse contrat via NEXT_PUBLIC_ESCROW_ADDRESS.
            </footer>
          </div>
        </main>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
