"use client";

import Link from "next/link";
import { useReadContract } from "wagmi";
import { ArrowRight, Shield, Zap, Lock, ChevronRight, Sparkles } from "lucide-react";
import { REGISTRY_CONTRACT } from "@/lib/contract";

const FEATURES = [
  {
    icon: <Lock className="w-6 h-6 text-violet-400" />,
    title: "Zero Knowledge Privacy",
    desc: "Your CGPA is never revealed. A ZK-SNARK cryptographically proves you meet the threshold — nothing more.",
  },
  {
    icon: <Shield className="w-6 h-6 text-cyan-400" />,
    title: "EAS Attestations",
    desc: "Universities sign credentials using Ethereum Attestation Service. Gasless, tamper-proof, and revocable.",
  },
  {
    icon: <Zap className="w-6 h-6 text-emerald-400" />,
    title: "On-Chain Verification",
    desc: "Employers call a smart contract directly on Sepolia. No backend. No oracle. No trust required.",
  },
  {
    icon: <Sparkles className="w-6 h-6 text-violet-400" />,
    title: "AI ATS Analysis",
    desc: "Get an instant resume score from local AI (Transformers.js) — fully in-browser, cryptographically bound to your credential. No data leaves your device.",
  },
];

// These are factual circuit/protocol properties — not data from the chain
const PROTOCOL_SPECS = [
  { label: "Gas for Holders",    value: "0",      unit: "ETH",     tooltip: "Off-chain EAS signing is gasless" },
  { label: "Verifications",      value: null,     unit: "",        tooltip: "Live from contract" },      // live
  { label: "Proof Size",         value: "256",    unit: "bytes",   tooltip: "Groth16 on BN128 curve" },
  { label: "Proving Time",       value: "~2",     unit: "seconds", tooltip: "In-browser SnarkJS WASM" },
];

function StatBar() {
  // Only the verification count is live — the rest are protocol specs
  const { data: total } = useReadContract({
    ...REGISTRY_CONTRACT,
    functionName: "totalVerifications",
    query: { refetchInterval: 15_000 },
  });

  return (
    <div className="glass grid grid-cols-2 md:grid-cols-4 divide-x divide-white/5 mb-24 overflow-hidden">
      {PROTOCOL_SPECS.map(({ label, value, unit, tooltip }) => {
        const display = label === "Verifications"
          ? (total?.toString() ?? "…")
          : value!;

        return (
          <div key={label} className="py-6 px-8 text-center" title={tooltip}>
            <div className="text-3xl font-black gradient-text mb-1">
              {display}
              {unit && <span className="text-lg ml-1 text-slate-500">{unit}</span>}
            </div>
            <div className="text-slate-500 text-sm">{label}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-6">
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></span>
          Live on Sepolia Testnet
        </div>

        <h1 className="text-5xl md:text-7xl font-black leading-none tracking-tight mb-6">
          Prove Your Credentials.
          <br />
          <span className="gradient-text">Reveal Nothing.</span>
        </h1>

        <p className="text-slate-400 text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
          Privacy-preserving academic verification powered by{" "}
          <span className="text-violet-400 font-semibold">ZK-SNARKs</span> and{" "}
          <span className="text-cyan-400 font-semibold">EAS</span>. Prove you
          qualified — without exposing a single grade.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/issue"
            className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-all hover:shadow-lg hover:shadow-violet-500/30 hover:-translate-y-0.5"
          >
            Issue Credential <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/verify"
            className="flex items-center gap-2 px-8 py-4 rounded-2xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all hover:-translate-y-0.5"
          >
            Verify Credential <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ── Stats Bar (live verification count + protocol specs) ─── */}
      <StatBar />

      {/* ── How It Works ────────────────────────────────────────── */}
      <section className="pb-24">
        <h2 className="text-3xl font-bold text-center mb-4">
          Fully Decentralized Flow
        </h2>
        <p className="text-slate-500 text-center mb-16 max-w-xl mx-auto">
          No backend. No API. No trusted intermediary. Every step is
          cryptographically verifiable on Ethereum.
        </p>

        <div className="relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-violet-500/50 via-cyan-500/50 to-transparent hidden md:block" />

          {[
            {
              step: "01",
              actor: "🏛️ University",
              color: "violet",
              title: "Sign Off-chain Attestation",
              desc: "University signs student data using EAS SDK. Gasless — no transaction needed.",
            },
            {
              step: "02",
              actor: "🧑‍🎓 Student",
              color: "cyan",
              title: "Generate ZK Proof",
              desc: "Student runs Groth16 prover in browser. CGPA stays private. Only threshold proof is exported.",
              right: true,
            },
            {
              step: "03",
              actor: "🏢 Employer",
              color: "emerald",
              title: "Verify On-chain",
              desc: "Employer calls ResumeRegistry.verifyCredential(). Smart contract verifies proof cryptographically.",
            },
          ].map(({ step, actor, color, title, desc, right }) => (
            <div
              key={step}
              className={`flex items-center gap-8 mb-12 ${right ? "md:flex-row-reverse" : ""}`}
            >
              <div className={`flex-1 glass glass-hover p-8 ${right ? "md:text-right" : ""}`}>
                <div className={`text-xs font-mono text-${color}-400 mb-2`}>
                  {actor}
                </div>
                <h3 className="text-xl font-bold mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
              <div className={`w-12 h-12 rounded-full bg-${color}-500/20 border border-${color}-500/40 flex items-center justify-center font-mono font-bold text-${color}-400 flex-shrink-0 hidden md:flex`}>
                {step}
              </div>
              <div className="flex-1 hidden md:block" />
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section className="pb-24">
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} className="glass glass-hover p-8">
              <div className="mb-4">{icon}</div>
              <h3 className="text-lg font-bold mb-3">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section className="pb-24">
        <div className="glass p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 via-transparent to-cyan-600/10 pointer-events-none" />
          <h2 className="text-3xl font-bold mb-4">Ready to build your ZK Resume?</h2>
          <p className="text-slate-400 mb-8">
            Connect your wallet and start proving credentials privately.
          </p>
          <Link
            href="/credentials"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold hover:opacity-90 transition-opacity glow-purple"
          >
            Get Started <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
