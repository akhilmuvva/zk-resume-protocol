"use client";

import { useReadContract } from "wagmi";
import { REGISTRY_CONTRACT, etherscanAddr, shortenAddress } from "@/lib/contract";
import { CONTRACTS } from "@/lib/wagmi";
import { useVerificationEvents } from "@/lib/useVerificationEvents";
import { ExternalLink, Cpu, Database, Activity, Loader2, RefreshCw, AlertCircle, Terminal, Globe, ShieldCheck } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { AnimatedBorderContainer } from "@/components/ui/AnimatedBorderContainer";
import { ShinyText } from "@/components/ui/ShinyText";
import { motion } from "framer-motion";

// ── Circuit spec (constants, not mocks) ──────────────
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
    <div className="h-6 w-16 rounded-md bg-white/5 animate-pulse" />
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
  const { events, loading: eventsLoading, error: eventsError, refetch } =
    useVerificationEvents(25);

  const isContractConfigured =
    CONTRACTS.RESUME_REGISTRY !== "0x0000000000000000000000000000000000000000";

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="mb-12 flex items-start justify-between flex-wrap gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-4xl font-bold mb-3 tracking-tight">On-Chain Explorer</h1>
          <p className="text-slate-400 text-lg">Real-time verification metrics directly from Sepolia.</p>
        </motion.div>
        
        <div className="flex items-center gap-4">
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={refetch}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${eventsLoading ? "animate-spin" : ""}`} /> 
            Sync Now
          </motion.button>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 px-5 py-2.5 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 backdrop-blur-xl"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-400 blur-sm rounded-full animate-pulse" />
              <div className="relative w-2 h-2 rounded-full bg-cyan-400" />
            </div>
            <span className="text-cyan-400 text-sm font-bold tracking-wide uppercase">Sepolia Live</span>
          </motion.div>
        </div>
      </div>

      {/* ── Deployment Status Warning ────────────────────────────────── */}
      {!isContractConfigured && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 mb-10 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-center gap-4 text-amber-200 text-sm"
        >
          <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0" />
          <p className="leading-relaxed">
            <span className="font-bold">Contract addresses missing.</span> Check your <code className="font-mono text-amber-400">.env.local</code> and make sure <code className="font-mono text-amber-400">NEXT_PUBLIC_REGISTRY_ADDRESS</code> is set.
          </p>
        </motion.div>
      )}

      {/* ── Live Stats ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          {
            label: "Verifications",
            value: totalLoading ? <Skeleton /> : (total?.toString() ?? (isContractConfigured ? "0" : "—")),
            sub: "On-chain counter",
            icon: <Activity className="w-5 h-5" />,
            color: "text-violet-400",
            glow: "shadow-[0_0_20px_rgba(139,92,246,0.1)]",
          },
          {
            label: "Verified Wallets",
            value: holdersLoading ? <Skeleton /> : ((holders as string[])?.length?.toString() ?? (isContractConfigured ? "0" : "—")),
            sub: "Unique addresses",
            icon: <Globe className="w-5 h-5" />,
            color: "text-cyan-400",
            glow: "shadow-[0_0_20px_rgba(34,211,238,0.1)]",
          },
          {
            label: "Live Events",
            value: eventsLoading ? <Skeleton /> : events.length.toString(),
            sub: "Last 25 transactions",
            icon: <Terminal className="w-5 h-5" />,
            color: "text-emerald-400",
            glow: "shadow-[0_0_20px_rgba(52,211,153,0.1)]",
          },
          {
            label: "ZK Constraints",
            value: "1,024",
            sub: "Circom circuit size",
            icon: <Cpu className="w-5 h-5" />,
            color: "text-amber-400",
            glow: "shadow-[0_0_20px_rgba(251,191,36,0.1)]",
          },
        ].map(({ label, value, sub, icon, color, glow }) => (
          <SpotlightCard key={label} className={`p-8 border border-white/5 ${glow}`}>
            <div className={`${color} mb-4`}>{icon}</div>
            <div className="text-3xl font-bold mb-1 tracking-tight">{value}</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</div>
            <div className="text-[10px] text-slate-600 mt-1 font-medium">{sub}</div>
          </SpotlightCard>
        ))}
      </div>

      {/* ── Contract Info & Circuit Spec ─────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-8 mb-12">
        {/* Deployed Contracts */}
        <SpotlightCard className="p-1">
          <div className="p-8">
            <h2 className="text-xl font-bold mb-8 flex items-center gap-3">
              <Database className="w-6 h-6 text-violet-400" />
              Smart Contracts
            </h2>
            <div className="space-y-2">
              {[
                { label: "ResumeRegistry",  addr: CONTRACTS.RESUME_REGISTRY },
                { label: "ResumeVerifier",  addr: CONTRACTS.RESUME_VERIFIER },
                { label: "EAS Service",   addr: CONTRACTS.EAS_SEPOLIA     },
              ].map(({ label, addr }) => {
                const isPlaceholder = addr === "0x0000000000000000000000000000000000000000";
                return (
                  <div key={label} className="p-4 rounded-2xl bg-white/3 border border-white/5 hover:bg-white/5 transition-colors group">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{label}</p>
                    {isPlaceholder ? (
                      <span className="font-mono text-xs text-amber-500 font-bold italic">Unassigned</span>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm text-slate-300 group-hover:text-white transition-colors">{shortenAddress(addr)}</span>
                        <a
                          href={etherscanAddr(addr)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-all"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="mt-8 pt-6 border-t border-white/5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">EAS Schema UID</p>
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 font-mono text-[11px] text-slate-400 break-all leading-relaxed">
                {process.env.NEXT_PUBLIC_SCHEMA_UID || "NOT_CONFIGURED_UID"}
              </div>
            </div>
          </div>
        </SpotlightCard>

        {/* Circuit Spec */}
        <SpotlightCard className="p-1">
          <div className="p-8">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-3">
              <Cpu className="w-6 h-6 text-cyan-400" />
              Circuit Architecture
            </h2>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              Static definitions from <code className="text-violet-300 px-1 font-mono">resume.circom</code>.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {CIRCUIT_SPEC.map(({ label, value, note }) => (
                <div key={label} className="p-5 rounded-2xl bg-white/3 border border-white/5 group hover:border-cyan-500/20 transition-all">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
                  <p className="text-lg font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">{value}</p>
                  <p className="text-[10px] text-slate-600 mt-1 font-mono">{note}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-8 p-6 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 flex items-start gap-4">
              <ShieldCheck className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-cyan-300">Verified Proving System</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Groth16 protocol ensures that proofs are small (256 bytes) and fast to verify on-chain, keeping gas costs minimal.
                </p>
              </div>
            </div>
          </div>
        </SpotlightCard>
      </div>

      {/* ── Live Event Log ────────────────────────────────────────────── */}
      <AnimatedBorderContainer>
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Activity className="w-6 h-6 text-emerald-400" />
                Latest Verifications
              </h2>
              <p className="text-sm text-slate-500 mt-1">Direct stream from the Ethereum event log.</p>
            </div>
            {eventsLoading && (
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                POLLING...
              </div>
            )}
          </div>

          {eventsError && (
            <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/20 text-red-400 flex items-center gap-4 mb-8">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <div>
                <p className="font-bold">Sync Error</p>
                <p className="text-xs opacity-70 font-mono mt-1">{eventsError}</p>
              </div>
            </div>
          )}

          {!eventsLoading && !eventsError && events.length === 0 && (
            <div className="text-center py-24 text-slate-600">
              <Activity className="w-16 h-16 mx-auto mb-4 opacity-10" />
              <p className="text-lg font-bold text-slate-500">Silence on the wire</p>
              <p className="text-sm mt-2 max-w-sm mx-auto">
                No on-chain verifications detected yet. Be the first to secure your resume!
              </p>
            </div>
          )}

          {events.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-white/5 bg-black/20 backdrop-blur-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/5">
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Holder</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Issuer</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Score Req</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">TX Hash</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Age</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {events.map((ev) => (
                      <tr key={ev.txHash} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-5">
                          <a
                            href={`https://sepolia.etherscan.io/address/${ev.holder}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-sm text-slate-300 group-hover:text-cyan-400 transition-colors"
                          >
                            {ev.holderShort}
                          </a>
                        </td>
                        <td className="px-6 py-5">
                          <span className="font-mono text-xs text-slate-500">{ev.universityShort}</span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-bold tracking-tighter">
                            ≥ {ev.threshold}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <a
                            href={`https://sepolia.etherscan.io/tx/${ev.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-xs text-slate-500 hover:text-white transition-all flex items-center gap-2"
                          >
                            {ev.txHash.slice(0, 8)}...{ev.txHash.slice(-6)}
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </a>
                        </td>
                        <td className="px-6 py-5 text-right whitespace-nowrap">
                          <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors">{ev.age}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </AnimatedBorderContainer>
    </div>
  );
}
