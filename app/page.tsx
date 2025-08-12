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

/* ---------- UI Modernisée ---------- */
function HeaderBar() {
  return (
    <div className="flex items-center justify-between py-4 px-6 backdrop-blur-lg bg-white/10 rounded-2xl border border-white/20">
      <div className="font-bold text-xl tracking-tight text-white">HybriX</div>
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
      if (injectedConnector) {
        await connect({ connector: injectedConnector });
        return;
      }
      if (eth) {
        await eth.request({ method: "eth_requestAccounts" });
        return;
      }
      window.open("https://metamask.io/download/", "_blank");
    } catch (e) {
      alert(errorMessage(e));
    }
  };

  return (
    <div className="flex items-center gap-3 text-sm text-white">
      <span
        className={`px-3 py-1 rounded-full ${isConnected ? "bg-green-500/30" : "bg-gray-500/30"}`}
        suppressHydrationWarning
      >
        {isConnected ? `${address?.slice(0, 6)}…${address?.slice(-4)}` : "Non connecté"}
      </span>
      {!isConnected ? (
        <button
          className="px-4 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg hover:scale-105 transition"
          onClick={tryConnect}
        >
          {injectedConnector || eth ? "Connecter" : "Installer MetaMask"}
        </button>
      ) : (
        <button
          className="px-4 py-1 rounded-full border border-white/30 hover:bg-white/10 transition"
          onClick={() => disconnect()}
        >
          Déconnecter
        </button>
      )}
      <span className="px-3 py-1 rounded-full border border-white/30" suppressHydrationWarning>
        Réseau: {chainId === polygonAmoy.id ? "Polygon Amoy" : "changer sur Amoy"}
      </span>
      {status === "error" && <span className="text-red-400">{error?.message}</span>}
    </div>
  );
}

function Hero() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="text-center py-20 text-white"
    >
      <h1 className="text-5xl md:text-6xl font-extrabold mb-4">
        Hybrid Talent Marketplace
      </h1>
      <p className="text-lg max-w-2xl mx-auto mb-6 opacity-80">
        Missions B2B réalisées par des duos <b>IA + expert humain</b>. Paiements sécurisés via <b>escrow Web3</b>.
      </p>
      <div className="flex justify-center gap-4">
        <a
          className="px-6 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg hover:scale-105 transition"
          href="#post"
        >
          Publier une mission
        </a>
        <a
          className="px-6 py-3 rounded-full border border-white/30 hover:bg-white/10 transition"
          href="#find"
        >
          Former mon duo
        </a>
      </div>
    </motion.div>
  );
}

/* ---------- Page ---------- */
export default function Page() {
  const [missions, setMissions] = useState<Mission[]>(sampleMissions);
  const addMission = (m: Mission) => setMissions((prev) => [m, ...prev]);

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <main className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-black text-white p-6">
          <div className="max-w-6xl mx-auto space-y-10">
            <HeaderBar />
            <Hero />
            {/* Ici tu gardes tes autres sections FindTalent, PostMission, Contracts en leur ajoutant styles modernisés */}
          </div>
        </main>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
