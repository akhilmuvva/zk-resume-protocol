"use client";

import Link from "next/link";
import { useReadContract } from "wagmi";
import { ArrowRight, Shield, Zap, Lock, ChevronRight, Sparkles } from "lucide-react";
import { REGISTRY_CONTRACT } from "@/lib/contract";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { ShinyText } from "@/components/ui/ShinyText";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { AnimatedBorderContainer } from "@/components/ui/AnimatedBorderContainer";
import { motion } from "framer-motion";

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
    desc: "Get an instant resume score from local AI — fully in-browser, cryptographically bound to your credential.",
  },
];

const PROTOCOL_SPECS = [
  { label: "Gas for Holders",    value: "0",      unit: "ETH" },
  { label: "Verifications",      value: null,     unit: "" },      
  { label: "Proof Size",         value: "256",    unit: "bytes" },
  { label: "Proving Time",       value: "~2",     unit: "seconds" },
];

function StatBar() {
  const { data: total } = useReadContract({
    ...REGISTRY_CONTRACT,
    functionName: "totalVerifications",
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-24">
      {PROTOCOL_SPECS.map(({ label, value, unit }) => {
        const display = label === "Verifications" ? (total?.toString() ?? "…") : value!;
        return (
          <Card key={label} className="border-white/5 bg-white/[0.02]">
            <CardHeader className="pb-2 text-center">
              <CardDescription className="text-xs uppercase tracking-widest">{label}</CardDescription>
              <CardTitle className="text-3xl font-black gradient-text">
                {display}{unit && <span className="text-lg ml-1 text-slate-500">{unit}</span>}
              </CardTitle>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-6 overflow-hidden">
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="pt-24 pb-16 text-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-600/10 blur-[120px] -z-10 rounded-full" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></span>
            Live on Sepolia Testnet
          </div>

          <h1 className="text-5xl md:text-8xl font-black leading-none tracking-tight mb-8">
            <ShinyText text="Prove Credentials." className="block mb-2" />
            <span className="gradient-text">Reveal Nothing.</span>
          </h1>

          <p className="text-slate-400 text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            Privacy-preserving academic verification powered by ZK-SNARKs. 
            Prove you qualified — without exposing a single grade.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/issue">
              <Button variant="shiny" size="xl" className="rounded-2xl">
                Issue Credential <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/verify">
              <Button variant="outline" size="xl" className="rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 text-white">
                Verify Credential <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      <StatBar />

      {/* ── How It Works ────────────────────────────────────────── */}
      <section className="pb-24 relative">
        <h2 className="text-4xl font-bold text-center mb-4 font-syne">
          Fully Decentralized Flow
        </h2>
        <p className="text-slate-500 text-center mb-16 max-w-xl mx-auto">
          No backend. No API. No trusted intermediary. Every step is cryptographically verifiable.
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: "01",
              actor: "🏛️ University",
              color: "violet",
              title: "Sign Attestation",
              desc: "University signs student data using EAS. Gasless and tamper-proof.",
            },
            {
              step: "02",
              actor: "🧑‍🎓 Student",
              color: "cyan",
              title: "Generate ZK Proof",
              desc: "Student runs Groth16 prover in browser. CGPA stays private.",
            },
            {
              step: "03",
              actor: "🏢 Employer",
              color: "emerald",
              title: "Verify On-chain",
              desc: "Employer calls the smart contract. Verify proofs instantly.",
            },
          ].map(({ step, actor, title, desc }) => (
            <AnimatedBorderContainer key={step} containerClassName="h-full">
              <div className="p-8 h-full flex flex-col">
                <div className="text-xs font-mono text-violet-400 mb-2 uppercase tracking-widest">{actor}</div>
                <h3 className="text-2xl font-bold mb-3 font-syne">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6 flex-1">{desc}</p>
                <div className="text-4xl font-black opacity-10 font-mono self-end">{step}</div>
              </div>
            </AnimatedBorderContainer>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section className="pb-24">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map(({ icon, title, desc }) => (
            <SpotlightCard key={title}>
              <div className="mb-6 w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-violet-500/50 transition-colors">
                {icon}
              </div>
              <h3 className="text-lg font-bold mb-3 font-syne text-white">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </SpotlightCard>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section className="pb-24">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
          <div className="relative glass p-16 text-center overflow-hidden rounded-3xl">
            <h2 className="text-4xl font-bold mb-6 font-syne">Ready to build your ZK Resume?</h2>
            <p className="text-slate-400 mb-10 max-w-xl mx-auto text-lg">
              Connect your wallet and start proving credentials privately on the blockchain.
            </p>
            <Link href="/credentials">
              <Button variant="shiny" size="xl" className="rounded-2xl px-12">
                Get Started <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
