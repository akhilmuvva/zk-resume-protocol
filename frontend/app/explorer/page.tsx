"use client";

import { useReadContract } from "wagmi";
import { REGISTRY_CONTRACT, etherscanAddr, shortenAddress } from "@/lib/contract";
import { CONTRACTS } from "@/lib/wagmi";
import { useVerificationEvents } from "@/lib/useVerificationEvents";
import { ExternalLink, Cpu, Database, Activity, Loader2, RefreshCw, AlertCircle } from "lucide-react";

// ── Circuit spec (immutable constants, not mock data) ──────────────
const CIRCUIT_SPEC = [
  { label: "Constraints",  value: "1,024",     note: "Circom R1CS"  },
  { label: "Proving Time", value: "~2s",        note: "Browser WASM" },
  { label: "Proof Size",   value: "256 bytes",  note: "Groth16"      },
  { label: "Backend",      value: "SnarkJS",    note: "v0.7"         },
  { label: "Curve",        value: "BN128",      note: "alt_bn128"    },
  { label: "Protocol",     value: "Groth16",    note: "zk-SNARK"     },
];

function Skeleton() {
  return (
    <div className="h-5 w-24 rounded-lg bg-white/5 animate-pulse" />
  );
}

export default function ExplorerPage() {
  // ── On-chain reads ────────────────────────────────────────────────
  const { data: total, isLoading: totalLoading } = useReadContract({
    ...REGISTRY_CONTRACT,
    functionName: "totalVerifications",
    query: { refetchInterval: 12_000 },
  });

  const { data: holders, isLoading: holdersLoading } = useReadContract({
    ...REGISTRY_CONTRACT,
    functionName: "getAllVerifiedHolders",
    query: { refetchInterval: 12_000 },
  });

  // ── Live event log ────────────────────────────────────────────────
  const { events, loading: eventsLoading, error: eventsError, isDeployed, refetch } =
    useVerificationEvents(25);

  const isContractConfigured =
    CONTRACTS.RESUME_REGISTRY !== "0x0000000000000000000000000000000000000000";

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="mb-10 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2">Technical Explorer</h1>
          <p className="text-slate-400">Live on-chain data — no mocks, no placeholders.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refetch}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass text-slate-400 hover:text-white text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <span className="flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Sepolia Testnet
          </span>
        </div>
      </div>

      {/* ── Deployment Status Warning ────────────────────────────────── */}
      {!isContractConfigured && (
        <div className="glass p-4 mb-8 border-amber-500/30 flex items-center gap-3 text-amber-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>
            Contract addresses not configured. Deploy the backend and set{" "}
            <code className="font-mono text-amber-300">NEXT_PUBLIC_REGISTRY_ADDRESS</code> in{" "}
            <code className="font-mono text-amber-300">.env.local</code> to see live data.
          </span>
        </div>
      )}

      {/* ── Live Stats ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Total Verifications",
            value: totalLoading ? <Skeleton /> : (total?.toString() ?? (isContractConfigured ? "0" : "—")),
            sub: "on-chain count",
            icon: <Activity className="w-5 h-5" />,
            color: "violet",
          },
          {
            label: "Unique Holders",
            value: holdersLoading ? <Skeleton /> : ((holders as string[])?.length?.toString() ?? (isContractConfigured ? "0" : "—")),
            sub: "verified wallets",
            icon: <Database className="w-5 h-5" />,
            color: "cyan",
          },
          {
            label: "Events Fetched",
            value: eventsLoading ? <Skeleton /> : events.length.toString(),
            sub: "from event log",
            icon: <Activity className="w-5 h-5" />,
            color: "emerald",
          },
          {
            label: "Circuit Constraints",
            value: "1,024",
            sub: "fixed circuit spec",
            icon: <Cpu className="w-5 h-5" />,
            color: "amber",
          },
        ].map(({ label, value, sub, icon, color }) => (
          <div key={label} className="glass p-6">
            <div className={`text-${color}-400 mb-3`}>{icon}</div>
            <div className="text-2xl font-bold mb-0.5">{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
            <div className="text-xs text-slate-600 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Contract Info & Circuit Spec ─────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Deployed Contracts */}
        <div className="glass p-8">
          <h2 className="font-bold text-lg mb-6 flex items-center gap-2">
            <Database className="w-5 h-5 text-violet-400" /> Deployed Contracts
          </h2>
          {[
            { label: "ResumeRegistry",  addr: CONTRACTS.RESUME_REGISTRY },
            { label: "ResumeVerifier",  addr: CONTRACTS.RESUME_VERIFIER },
            { label: "EAS (Sepolia)",   addr: CONTRACTS.EAS_SEPOLIA     },
          ].map(({ label, addr }) => {
            const isPlaceholder = addr === "0x0000000000000000000000000000000000000000";
            return (
              <div key={label} className="py-4 border-b border-white/5 last:border-0">
                <p className="text-xs text-slate-500 mb-1">{label}</p>
                {isPlaceholder ? (
                  <span className="font-mono text-xs text-amber-500">Not deployed yet</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-slate-300">{shortenAddress(addr)}</span>
                    <a
                      href={etherscanAddr(addr)}
                      target="_blank"
                      rel="noreferrer"
                      title="View on Etherscan"
                      className="text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>
            );
          })}
          <div className="pt-4">
            <p className="text-xs text-slate-500 mb-1">EAS Schema UID</p>
            <p className="font-mono text-xs text-slate-400 break-all">
              {process.env.NEXT_PUBLIC_SCHEMA_UID
                ? process.env.NEXT_PUBLIC_SCHEMA_UID
                : <span className="text-amber-500">Not configured (NEXT_PUBLIC_SCHEMA_UID)</span>}
            </p>
          </div>
        </div>

        {/* Circuit Spec */}
        <div className="glass p-8">
          <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" /> Circuit Specification
          </h2>
          <p className="text-xs text-slate-600 mb-5">
            Fixed constants from <code className="text-violet-400">resume.circom</code> — not live data
          </p>
          <div className="grid grid-cols-2 gap-3">
            {CIRCUIT_SPEC.map(({ label, value, note }) => (
              <div key={label} className="bg-white/3 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                <p className="font-bold text-sm">{value}</p>
                <p className="text-xs text-slate-600 mt-0.5">{note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Live Event Log ────────────────────────────────────────────── */}
      <div className="glass p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-violet-400" />
            Recent Verifications
            <span className="text-xs font-normal text-slate-500 ml-1">(live from contract events)</span>
          </h2>
          {eventsLoading && (
            <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
          )}
        </div>

        {/* RPC / fetch error */}
        {eventsError && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 text-sm mb-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Could not fetch events</p>
              <p className="text-xs text-red-400/70 mt-0.5 font-mono">{eventsError}</p>
            </div>
          </div>
        )}

        {/* No events yet */}
        {!eventsLoading && !eventsError && events.length === 0 && (
          <div className="text-center py-16 text-slate-600">
            <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-slate-500">No verifications yet</p>
            <p className="text-sm mt-1">
              {isContractConfigured
                ? "Be the first to verify a credential on-chain."
                : "Deploy the contract and configure the address in .env.local."}
            </p>
          </div>
        )}

        {/* Event table */}
        {events.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 text-xs uppercase tracking-wider border-b border-white/5">
                  <th className="pb-4 pr-4">Holder</th>
                  <th className="pb-4 pr-4">University</th>
                  <th className="pb-4 pr-4">Min CGPA</th>
                  <th className="pb-4 pr-4">TX Hash</th>
                  <th className="pb-4 pr-4">Block</th>
                  <th className="pb-4">Age</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {events.map((ev) => (
                  <tr key={ev.txHash + ev.blockNumber.toString()} className="hover:bg-white/2 transition-colors">
                    <td className="py-4 pr-4">
                      <a
                        href={`https://sepolia.etherscan.io/address/${ev.holder}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-slate-300 hover:text-white transition-colors"
                      >
                        {ev.holderShort}
                      </a>
                    </td>
                    <td className="py-4 pr-4">
                      <a
                        href={`https://sepolia.etherscan.io/address/${ev.university}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-slate-400 hover:text-white text-xs transition-colors"
                      >
                        {ev.universityShort}
                      </a>
                    </td>
                    <td className="py-4 pr-4">
                      <span className="px-2 py-1 rounded-full bg-violet-500/10 text-violet-400 text-xs font-semibold">
                        ≥ {ev.threshold}
                      </span>
                    </td>
                    <td className="py-4 pr-4">
                      <a
                        href={`https://sepolia.etherscan.io/tx/${ev.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-cyan-400 hover:underline text-xs flex items-center gap-1"
                      >
                        {ev.txHash.slice(0, 10)}…{ev.txHash.slice(-6)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="py-4 pr-4 font-mono text-slate-500 text-xs">
                      #{ev.blockNumber.toString()}
                    </td>
                    <td className="py-4 text-slate-500 text-xs whitespace-nowrap">
                      {ev.age}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
