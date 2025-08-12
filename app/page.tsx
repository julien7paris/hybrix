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

/* ---------- UI ---------- */

function HeaderBar() {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="font-semibold tracking-tight text-lg">HybriX</div>
      <WalletControls />
    </div>
  );
}

/** ✅ WalletControls: anti-hydration + fallback MetaMask */
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

  if (!mounted) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="px-2 py-1 rounded bg-gray-200">Non connecté</span>
        <button className="px-3 py-1 rounded border" disabled>
          Connecter
        </button>
        <span className="px-2 py-1 rounded border">Réseau: …</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className={`px-2 py-1 rounded ${isConnected ? "bg-green-100" : "bg-gray-200"}`} suppressHydrationWarning>
        {isConnected ? `${address?.slice(0, 6)}…${address?.slice(-4)}` : "Non connecté"}
      </span>

      {!isConnected ? (
        <button className="px-3 py-1 rounded bg-black text-white" onClick={tryConnect}>
          {injectedConnector || eth ? "Connecter" : "Installer MetaMask"}
        </button>
      ) : (
        <button className="px-3 py-1 rounded border" onClick={() => disconnect()}>
          Déconnecter
        </button>
      )}

      <span className="px-2 py-1 rounded border" suppressHydrationWarning>
        Réseau: {chainId === polygonAmoy.id ? "Polygon Amoy" : "changer sur Amoy"}
      </span>

      {status === "error" && <span className="text-red-600">{error?.message}</span>}
    </div>
  );
}

function Hero() {
  return (
    <div className="text-center space-y-3 py-8">
      <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Hybrid Talent Marketplace</h1>
      <p className="text-gray-600 max-w-2xl mx-auto">
        Missions réalisées par des binômes <b>IA + Expert Humain</b>. #Data & AnalyticsPaiements #Marketing & Growth #Design & Création #Juridique & Conformité #Support & Relation Client. Sécurisés via <b>Wallet Web3</b>.
      </p>
      <div className="flex justify-center gap-3">
        <a className="px-4 py-2 rounded-2xl bg-black text-white" href="#post">
          Publier une mission
        </a>
        <a className="px-4 py-2 rounded-2xl border" href="#find">
          Trouver un binôme
        </a>
      </div>
      <div className="flex items-center justify-center gap-2 text-xs mt-2 text-gray-500">
        <span>Facturation auto • Escrow • NFT (v2)</span>
      </div>
    </div>
  );
}

function FindTalent({ onPropose }: { onPropose: (name: string) => void }) {
  const [q, setQ] = useState("");
  const list = useMemo(
    () => seedTalent.filter((t) => (t.name + " " + t.skills.join(" ")).toLowerCase().includes(q.toLowerCase())),
    [q]
  );
  return (
    <section id="find" className="grid md:grid-cols-3 gap-4">
      <div className="md:col-span-1 space-y-2">
        <input
          placeholder="Rechercher (nom, skill)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <div className="text-xs text-gray-500">{list.length} profils</div>
      </div>
      <div className="md:col-span-2 grid gap-4">
        {list.map((t) => (
          <div key={t.id} className="rounded-2xl border p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{t.name}</span>
              <div className="flex gap-2 items-center text-sm">
                <span className="px-2 py-0.5 bg-gray-100 rounded">{t.rating.toFixed(1)}★</span>
                <span className="px-2 py-0.5 border rounded">{t.rate} €/h</span>
              </div>
            </div>
            <div className="mt-2 flex gap-2 flex-wrap text-xs">
              {t.skills.map((s) => (
                <span key={s} className="px-2 py-0.5 rounded bg-gray-100">
                  {s}
                </span>
              ))}
            </div>
            <div className="mt-3">
              <button className="px-3 py-1.5 rounded-2xl bg-black text-white" onClick={() => onPropose(t.name)}>
                Proposer une mission
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PostMission({ onCreate }: { onCreate: (m: Mission) => void }) {
  const [title, setTitle] = useState("");
  const [budget, setBudget] = useState("");
  const [desc, setDesc] = useState("");

  return (
    <section id="post" className="rounded-2xl border p-4">
      <div className="font-semibold mb-3">Publier une mission</div>
      <div className="grid md:grid-cols-3 gap-3">
        <input
          className="border rounded px-3 py-2"
          placeholder="Titre"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="Budget (€)"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2 md:col-span-3"
          placeholder="Description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </div>
      <div className="mt-3">
        <button
          className="px-4 py-2 rounded-2xl bg-black text-white"
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
            setTitle("");
            setBudget("");
            setDesc("");
          }}
        >
          Créer
        </button>
      </div>
    </section>
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
    <section className="grid md:grid-cols-2 gap-4">
      <div className="rounded-2xl border p-4">
        <div className="font-semibold mb-2">Créer un deal (client → talent)</div>
        <input
          className="border rounded px-3 py-2 w-full mb-2"
          placeholder="Adresse du talent (0x...)"
          value={talent}
          onChange={(e) => setTalent(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2 w-full mb-2"
          placeholder="Montant en ETH (testnet)"
          value={amountEth}
          onChange={(e) => setAmountEth(e.target.value)}
        />
        <div className="text-xs text-gray-500 mb-3">Prochain ID estimé: {String(nextId ?? "?")}</div>
        <button
          disabled={!isConnected || !talent || !amountEth}
          className="px-4 py-2 rounded-2xl bg-black text-white disabled:opacity-50"
          onClick={async () => {
            try {
              await writeContractAsync({
                abi: escrowAbi,
                address: ESCROW_ADDRESS,
                functionName: "createDeal",
                args: [talent as Address, parseEthToWei(amountEth)],
              });
              alert("Deal créé. Utilise l'ID = nextId - 1.");
            } catch (e) {
              alert(errorMessage(e));
            }
          }}
        >
          Créer
        </button>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="font-semibold mb-2">Financer & Libérer</div>
        <input
          className="border rounded px-3 py-2 w-full mb-2"
          placeholder="ID du deal"
          value={dealId}
          onChange={(e) => setDealId(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2 w-full mb-2"
          placeholder="Montant en ETH (pour financer)"
          value={amountEth}
          onChange={(e) => setAmountEth(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            disabled={!isConnected || !dealId || !amountEth}
            className="px-4 py-2 rounded-2xl bg-black text-white disabled:opacity-50"
            onClick={async () => {
              try {
                await writeContractAsync({
                  abi: escrowAbi,
                  address: ESCROW_ADDRESS,
                  functionName: "fundDeal",
                  args: [BigInt(dealId)],
                  value: parseEthToWei(amountEth),
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
            className="px-4 py-2 rounded-2xl border disabled:opacity-50"
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
        <p className="text-xs text-gray-500 mt-2">Pour la prod : passer en USDC + jalons multiples.</p>
      </div>
    </section>
  );
}

/* ---------- Page ---------- */
export default function Page() {
  const [missions, setMissions] = useState<Mission[]>(sampleMissions);
  const addMission = (m: Mission) => setMissions((prev) => [m, ...prev]);

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <main className="min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-900 p-4 md:p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <HeaderBar />
            <Hero />

            <section className="space-y-6">
              <FindTalent onPropose={(name) => alert(`Proposer une mission à ${name}`)} />
              <div className="grid gap-3">
                <h3 className="font-semibold">Missions ouvertes</h3>
                {missions.map((m) => (
                  <div key={m.id} className="rounded-2xl border p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{m.title}</span>
                      <span className="px-2 py-0.5 rounded border text-sm">Budget {m.budget} €</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{m.desc}</p>
                  </div>
                ))}
              </div>
              <PostMission onCreate={addMission} />
              <Contracts />
            </section>

            <footer className="text-xs text-gray-500 pt-8">
              © {new Date().getFullYear()} HybriX — MVP testnet. Adresse contrat via NEXT_PUBLIC_ESCROW_ADDRESS.
            </footer>
          </div>
        </main>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
