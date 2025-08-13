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
  skills: string[];
  rate: number;
  rating: number;
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
    // ✅ 1) Fallback RPC public Amoy si la variable d'env est absente
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

/* ---------- Données démo ---------- */
const seedTalent: Talent[] = [
  { id: 1, name: "Alice Martin", skills: ["Prompt Eng.", "Data Viz"], rate: 65, rating: 4.8 },
  { id: 2, name: "Bilal Cohen", skills: ["Fintech", "Solidity"], rate: 85, rating: 4.7 },
  { id: 3, name: "Chloé Dubois", skills: ["UX", "Automation"], rate: 55, rating: 4.6 },
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
    <div className="flex items-center justify-between py-4 px-6 backdrop-blur-xl bg-white/10 rounded-2xl border border-white/15">
      <div className="font-extrabold text-xl tracking-tight text-white">HybriX</div>
      <WalletControls />
    </div>
  );
}

function WalletControls() {
  const { address, chainId, isConnected } = useAccount();
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
      <span
        className={`px-3 py-1 rounded-full ${
          isConnected ? "bg-emerald-600 text-white" : "bg-purple-800 text-white"
        }`}
        suppressHydrationWarning
      >
        {isConnected ? `${address?.slice(0, 6)}…${address?.slice(-4)}` : "Non connecté"}
      </span>

      {!isConnected ? (
        <button
          className="px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-700 text-white shadow-lg hover:scale-105 transition"
          onClick={tryConnect}
        >
          {injectedConnector || eth ? "Connecter" : "Installer MetaMask"}
        </button>
      ) : (
        <button
          className="px-4 py-1.5 rounded-full border border-white/25 hover:bg-white/10 transition"
          onClick={() => disconnect()}
        >
          Déconnecter
        </button>
      )}

      <span className="px-3 py-1 rounded-full border border-white/25" suppressHydrationWarning>
        Réseau: {chainId === polygonAmoy.id ? "Polygon Amoy" : "changer sur Amoy"}
      </span>
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
        Missions réalisées par des duos <b>IA + Expert Humain</b> — Data & Analytics • Marketing & Growth • Design & Création • Juridique & Conformité • Support Client.
        Paiements sécurisés via escrow Web3.
      </p>
      <div className="flex justify-center gap-4 mt-6">
        <a href="#post" className="px-6 py-3 rounded-full bg-black text-white font-medium">
          Publier une mission
        </a>
        <a href="#find" className="px-6 py-3 rounded-full border border-white text-white font-medium">
          Trouver un binôme
        </a>
      </div>
      <div className="mt-3 text-sm text-white/60">
        Facturation auto • Escrow • NFT (v2)
      </div>
    </motion.div>
  );
}

function FindTalent({ onPropose }: { onPropose: (name: string) => void }) {
  const [q, setQ] = useState("");
  const list = useMemo(
    () => seedTalent.filter((t) => (t.name + " " + t.skills.join(" ")).toLowerCase().includes(q.toLowerCase())),
    [q]
  );
  return (
    <motion.section id="find" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}
      className="grid md:grid-cols-3 gap-5">
      <motion.div variants={fadeCard}
        className="md:col-span-1 space-y-2 p-5 rounded-3xl border border-white/15 bg-white/5 backdrop-blur-xl">
        <div className="text-white/90 font-semibold">Rechercher (nom, skill)</div>
        <input
          placeholder="Nom, compétence…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full border border-white/20 bg-purple-900/30 text-white rounded px-3 py-2 placeholder-white/50"
        />
        <div className="text-xs text-white/70">{list.length} profils</div>
      </motion.div>
      <div className="md:col-span-2 grid gap-4">
        {list.map((t) => (
          <motion.div variants={fadeCard} key={t.id}
            className="rounded-3xl border border-white/15 p-4 bg-white/5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="font-medium text-white">{t.name}</span>
              <div className="flex gap-2 items-center text-sm">
                <span className="px-2 py-0.5 bg-purple-800 text-white rounded">{t.rating.toFixed(1)}★</span>
                <span className="px-2 py-0.5 border border-white/20 text-white rounded">{t.rate} €/h</span>
              </div>
            </div>
            <div className="mt-2 flex gap-2 flex-wrap text-xs">
              {t.skills.map((s) => (
                <span key={s} className="px-2 py-0.5 rounded bg-purple-800 text-white">
                  {s}
                </span>
              ))}
            </div>
            <div className="mt-3">
              <button
                className="px-3 py-1.5 rounded-full bg-black text-white hover:scale-105 transition"
                onClick={() => onPropose(t.name)}
              >
                Proposer une mission
              </button>
            </div>
          </motion.div>
        ))}
      </div>
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
          type="number"           // ✅ 3) numeric
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
          className="px-5 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-700 text-white shadow-lg hover:scale-105 transition"
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
          type="number"           // ✅ 3) numeric
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
                // ✅ 2) parseEther remplace parseEthToWei
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
          type="number"           // ✅ 3) numeric
          inputMode="numeric"
          className="border border-white/20 bg-purple-900/30 text-white rounded px-3 py-2 w-full mb-2 placeholder-white/50 outline-none focus:ring-2 focus:ring-purple-400"
          placeholder="ID du deal"
          value={dealId}
          onChange={(e) => setDealId(e.target.value)}
        />
        <input
          type="number"           // ✅ 3) numeric
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
                  // ✅ 2) parseEther remplace parseEthToWei
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

/* ---------- Page ---------- */
export default function Page() {
  const [missions, setMissions] = useState<Mission[]>(sampleMissions);
  const addMission = (m: Mission) => setMissions((prev) => [m, ...prev]);

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
              {/* Recherche / Talents */}
              <FindTalent onPropose={(name) => alert(`Proposer une mission à ${name}`)} />

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
            </motion.section>

            {/* ---------- Appendice animé : Création de valeur IA + Humain ---------- */}
            <motion.section
              id="value-prop"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              className="bg-white rounded-3xl shadow-md p-6 md:p-10 space-y-8"
            >
              <motion.h2 variants={fadeCard} className="text-2xl md:text-3xl font-bold text-center text-gray-900">
                🚀 Création de valeur d’un duo IA + Humain
              </motion.h2>

              <div className="grid md:grid-cols-3 gap-6">
                {/* Confiance & adoption */}
                <motion.div variants={fadeCard} className="p-5 rounded-2xl border border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor">
                        <path d="M12 2.5l7 3v6.2c0 4.2-2.9 8.1-7 9.8-4.1-1.7-7-5.6-7-9.8V5.5l7-3zM11 15.6l5.3-5.3-1.4-1.4L11 12.8l-1.9-1.9-1.4 1.4 3.3 3.3z"/>
                      </svg>
                    </span>
                    <h3 className="font-semibold text-lg">Confiance & adoption</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    <b>Problème :</b> Les entreprises hésitent à déléguer totalement à une IA (erreurs, biais, conformité).
                  </p>
                  <p className="text-sm text-gray-600">
                    <b>Valeur :</b> L’expert humain sert de garant, valide et prend la responsabilité finale.
                    <br />→ Adoption accélérée, risque réduit.
                  </p>
                </motion.div>

                {/* Qualité & contexte */}
                <motion.div variants={fadeCard} className="p-5 rounded-2xl border border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor">
                        <path d="M12 2l1.6 3.7L17 7.3l-3.4 1.6L12 12l-1.6-3.1L7 7.3l3.4-1.6L12 2zm6.5 8.5l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9.9-2zM5.5 13.5l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7.7-1.6z"/>
                      </svg>
                    </span>
                    <h3 className="font-semibold text-lg">Qualité supérieure & contexte</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    <b>Problème :</b> L’IA ne capte pas toujours le contexte stratégique, culturel ou émotionnel.
                  </p>
                  <p className="text-sm text-gray-600">
                    <b>Valeur :</b> L’humain apporte intuition, jugement et intègre des infos non présentes dans les données.
                  </p>
                </motion.div>

                {/* Cas d’usage à forte valeur */}
                <motion.div variants={fadeCard} className="p-5 rounded-2xl border border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor">
                        <path d="M12 2a10 10 0 1010 10h-2A8 8 0 1112 4V2zm0 4a6 6 0 106 6h-2a4 4 0 11-4-4V6zm1 5a1 1 0 11-2 0 1 1 0 012 0z"/>
                      </svg>
                    </span>
                    <h3 className="font-semibold text-lg">Cas d’usage à forte valeur</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Audit juridique • Négociations B2B • Décisions financières • Conception UX
                  </p>
                  <p className="text-sm text-gray-600">
                    IA seule = risque d’erreurs coûteuses.
                    <br />Duo IA + humain = rapidité, scalabilité et validation experte.
                  </p>
                </motion.div>
              </div>
            </motion.section>

            <footer className="text-xs text-white/60 pt-8">
              © {new Date().getFullYear()} HybriX — MVP testnet. Adresse contrat via NEXT_PUBLIC_ESCROW_ADDRESS.
            </footer>
          </div>
        </main>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
