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
  transports: { [polygonAmoy.id]: http(rpcUrl) },
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
function parseEthToWei(ethStr: string): bigint {
  const n = parseFloat(ethStr);
  if (Number.isNaN(n)) return BigInt(0);
  return BigInt(Math.round(n * 1e18));
}
function errorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const anyErr = err as { shortMessage?: string; message?: string };
    return anyErr.shortMessage || anyErr.message || "Erreur";
  }
  return "Erreur";
}

/* ---------- Anim (renommés pour éviter collisions) ---------- */
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
      <span className={`px-3 py-1 rounded-full ${isConnected ? "bg-green-500/30" : "bg-gray-500/30"}`} suppressHydrationWarning>
        {isConnected ? `${address?.slice(0, 6)}…${address?.slice(-4)}` : "Non connecté"}
      </span>
      {!isConnected ? (
        <button
          className="px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg hover:scale-105 transition"
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
      className="text-center py-16 text-white relative"
    >
      {/* halos décoratifs */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-[420px] w-[720px] rounded-full bg-purple-600/20 blur-3xl" />
      <h1 className="text-4xl md:text-6xl font-extrabold mb-4 tracking-tight">
        Hybrid Talent Marketplace
      </h1>
      <p className="text-lg max-w-3xl mx-auto mb-7 opacity-90">
        Missions réalisées par des duos <b>IA + Expert Humain</b> — Data & Analytics • Marketing & Growth •
        Design & Création • Juridique & Conformité • Support Client. Paiements sécurisés via <b>escrow Web3</b>.
      </p>
      <div className="flex justify-center gap-4">
        <a className="px-6 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg hover:scale-105 transition" href="#post">
          Publier une mission
        </a>
        <a className="px-6 py-3 rounded-full border border-white/30 hover:bg-white/10 transition" href="#find">
          Trouver un binôme
        </a>
      </div>
      <div className="mt-3 text-xs opacity-70">Facturation auto • Escrow • NFT (v2)</div>
    </motion.div>
  );
}

function FindTalent({ onPropose }: { onPropose: (name: string) => void }) {
  const [q, setQ] = useState("");
  // Renommé pour éviter collision avec les variants
  const results = useMemo(
    () => seedTalent.filter((t) => (t.name + " " + t.skills.join(" ")).toLowerCase().includes(q.toLowerCase())),
    [q]
  );

  return (
    <motion.section
      id="find"
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      className="grid md:grid-cols-3 gap-5"
    >
      <motion.div variants={fadeCard}
        className="md:col-span-1 space-y-2 p-5 rounded-3xl border border-white/15 bg-white/5 backdrop-blur-xl">
        <div className="text-white/90 font-semibold">Rechercher (nom, skill)</div>
        <input
          placeholder="Nom, compétence…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full border border-white/20 bg-white/10 text-white placeholder-white/60 rounded-2xl px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400"
        />
        <div className="text-xs text-white/60">{results.length} profils</div>
      </motion.div>

      <div className="md:col-span-2 grid gap-4">
        {results.map((t) => (
          <motion.div key={t.id} variants={fadeCard}
            className="rounded-3xl border border-white/15 bg-white/5 backdrop-blur-xl p-5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-white">{t.name}</span>
              <div className="flex gap-2 items-center text-sm">
                <span className="px-2 py-0.5 bg-white/10 rounded-full text-white/90">{t.rating.toFixed(1)}★</span>
                <span className="px-2 py-0.5 border border-white/20 rounded-full text-white/90">{t.rate} €/h</span>
              </div>
            </div>
            <div className="mt-2 flex gap-2 flex-wrap text-xs">
              {t.skills.map((s) => (
                <span key={s} className="px-2 py-0.5 rounded-full bg-white/10 text-white/90">
                  {s}
                </span>
              ))}
            </div>
            <div className="mt-3">
              <button
                className="px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:scale-105 transition"
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
          className="border border-white/20 bg-white/10 text-white placeholder-white/60 rounded-2xl px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400"
          placeholder="Titre"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="border border-white/20 bg-white/10 text-white placeholder-white/60 rounded-2xl px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400"
          placeholder="Budget (€)"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
        />
        <input
          className="border border-white/20 bg-white/10 text-white placeholder-white/60 rounded-2xl px-3 py-2 md:col-span-3 outline-none focus:ring-2 focus:ring-purple-400"
          placeholder="Description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </div>
      <div className="mt-3">
        <button
          className="px-5 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg hover:scale-105 transition"
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
          className="border border-white/20 bg-white/10 text-white placeholder-white/60 rounded-2xl px-3 py-2 w-full mb-2 outline-none focus:ring-2 focus:ring-purple-400"
          placeholder="Adresse du talent (0x...)"
          value={talent}
          onChange={(e) => setTalent(e.target.value)}
        />
        <input
          className="border border-white/20 bg-white/10 text-white placeholder-white/60 rounded-2xl px-3 py-2 w-full mb-2 outline-none focus:ring-2 focus:ring-purple-400"
          placeholder="Montant en ETH (testnet)"
          value={amountEth}
          onChange={(e) => setAmountEth(e.target.value)}
        />
        <div className="text-xs text-white/60 mb-3">Prochain ID estimé: {String(nextId ?? "?")}</div>
        <button
          disabled={!isConnected || !talent || !amountEth}
          class
