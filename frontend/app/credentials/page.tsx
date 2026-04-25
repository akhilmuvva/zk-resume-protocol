"use client";

import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { generateProof, downloadProofFiles, buildProofInputFromAttestation, type ProofStep, type GeneratedProof } from "@/lib/snarkjs";
import { shortenAddress } from "@/lib/contract";
import { useToast } from "@/components/ToastProvider";
import { Copy, Upload, Download, Shield, Lock, CheckCircle, Loader2, AlertCircle, Fingerprint, EyeOff, BrainCircuit } from "lucide-react";
import type { SignedAttestation } from "@/lib/eas";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { AnimatedBorderContainer } from "@/components/ui/AnimatedBorderContainer";
import { Button } from "@/components/ui/Button";
import { ShinyText } from "@/components/ui/ShinyText";
import { motion, AnimatePresence } from "framer-motion";

type CredStatus = "idle" | "loading" | "done" | "error";

const STEP_LABELS: Record<ProofStep, string> = {
  idle:      "Hold tight...",
  hashing:   "Hashing with Poseidon...",
  witness:   "Building witness...",
  proving:   "Crafting calldata...",
  verifying: "Local verification...",
  done:      "Proof ready!",
  error:     "Something went wrong",
};

const STEP_ORDER: ProofStep[] = ["hashing", "witness", "verifying", "proving", "done"];

export default function CredentialsPage() {
  const { isConnected, address } = useAccount();
  const { toast } = useToast();

  const [attestation, setAttestation] = useState<SignedAttestation | null>(null);
  const [threshold, setThreshold]     = useState(800); // 8.00
  const [proofStatus, setProofStatus] = useState<CredStatus>("idle");
  const [currentStep, setCurrentStep] = useState<ProofStep>("idle");
  const [proof, setProof]             = useState<GeneratedProof | null>(null);
  const [copied, setCopied]           = useState(false);

  // Load that JSON file from the university
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        setAttestation(parsed);
        toast("Attestation loaded!", "success");
      } catch {
        toast("That file doesn't look right.", "error");
      }
    };
    reader.readAsText(file);
  };

  // Kick off the ZK proof generation
  const handleGenerateProof = useCallback(async () => {
    if (!attestation) return;
    setProofStatus("loading");
    setProof(null);

    try {
      const input = buildProofInputFromAttestation(attestation, threshold);
      const result = await generateProof(input, (step, msg) => {
        setCurrentStep(step);
      });
      setProof(result);
      setProofStatus("done");
      toast("ZK Proof generated and verified!", "success");
    } catch (err: any) {
      setProofStatus("error");
      toast(err.message || "Failed to generate proof", "error");
    }
  }, [attestation, threshold, toast]);

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-5xl font-bold mb-6 tracking-tight">
            Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">ZK Credentials</span>
          </h1>
          <p className="text-slate-400 mb-12 text-lg max-w-2xl mx-auto">
            Connect your wallet to start managing your private attestations and generating zero-knowledge proofs.
          </p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-12 flex items-start justify-between flex-wrap gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-4xl font-bold mb-3 tracking-tight">Credential Manager</h1>
          <p className="text-slate-400 text-lg">Generate proofs without revealing your actual data.</p>
        </motion.div>
        
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={copyAddress}
          className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-mono text-slate-300 hover:text-white hover:bg-white/10 transition-all backdrop-blur-xl"
        >
          <Fingerprint className="w-4 h-4 text-violet-400" />
          {shortenAddress(address || "")}
          <Copy className="w-4 h-4 opacity-50" />
          {copied && <span className="text-emerald-400 text-xs font-sans font-bold">Copied!</span>}
        </motion.button>
      </div>

      <div className="grid lg:grid-cols-[1fr,380px] gap-8">
        {/* Main Content Area */}
        <div className="space-y-8">
          <SpotlightCard className="p-1">
            <div className="p-8">
              <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                <Upload className="w-5 h-5 text-violet-400" />
                Load Attestation
              </h2>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                Upload the <code className="text-violet-300 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20">attestation.json</code> you got from your university.
                We only use this to generate the proof locally — it never leaves your browser.
              </p>

              <label className="relative flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl p-12 cursor-pointer hover:border-violet-500/40 hover:bg-violet-500/5 transition-all group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Upload className="w-12 h-12 text-slate-500 group-hover:text-violet-400 mb-4 transition-all transform group-hover:-translate-y-1" />
                <span className="text-slate-300 font-medium mb-1">Drop the JSON here</span>
                <span className="text-slate-500 text-xs">or click to browse files</span>
                <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
              </label>

              <AnimatePresence>
                {attestation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-300">File Loaded Successfully</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">UID: {attestation.uid?.slice(0, 32)}...</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </SpotlightCard>

          {/* Proof Generation Panel */}
          <AnimatePresence>
            {attestation && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
              >
                <AnimatedBorderContainer>
                  <div className="p-8">
                    <div className="flex items-start justify-between mb-8">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 text-2xl font-bold shadow-inner">
                          {attestation.meta.university?.slice(2, 4).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold tracking-tight">{attestation.decodedData.degree}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-mono text-slate-500">{shortenAddress(attestation.meta.university || "")}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-700" />
                            <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Verified Identity</span>
                          </div>
                        </div>
                      </div>
                      <div className="hidden sm:block">
                        <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-violet-400" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">End-to-End Private</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4 mb-8">
                      <div className="p-5 rounded-2xl bg-white/5 border border-white/10 group hover:border-violet-500/30 transition-colors">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Academic Result</p>
                        <div className="flex items-center gap-3">
                          <EyeOff className="w-5 h-5 text-violet-400" />
                          <ShinyText text="CGPA IS PRIVATE" className="font-mono text-sm font-bold opacity-80" />
                        </div>
                      </div>
                      <div className="p-5 rounded-2xl bg-white/5 border border-white/10 group hover:border-emerald-500/30 transition-colors">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">EAS Status</p>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                          <span className="text-sm font-bold text-slate-200">On-Chain Attested</span>
                        </div>
                      </div>
                    </div>

                    {/* Proof Slider */}
                    <div className="mb-10 p-6 rounded-3xl bg-white/3 border border-white/5">
                      <div className="flex justify-between items-end mb-4">
                        <div>
                          <p className="text-sm font-bold text-slate-300">Minimum Threshold</p>
                          <p className="text-xs text-slate-500">Only prove that your CGPA is above this value.</p>
                        </div>
                        <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
                          {(threshold / 100).toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range" min={600} max={950} step={10} value={threshold}
                        onChange={(e) => setThreshold(Number(e.target.value))}
                        className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-violet-500 hover:accent-violet-400 transition-all"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-slate-600 mt-3 px-1 uppercase tracking-tighter">
                        <span>Min (6.00)</span>
                        <span>Pass Level</span>
                        <span>High (9.50)</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button
                      onClick={handleGenerateProof}
                      disabled={proofStatus === "loading"}
                      variant="default"
                      className="w-full h-16 text-lg rounded-2xl group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-cyan-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {proofStatus === "loading" ? (
                        <div className="flex items-center gap-3">
                          <Loader2 className="w-6 h-6 animate-spin text-white" />
                          <span>{STEP_LABELS[currentStep]}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <BrainCircuit className="w-6 h-6 text-violet-300 group-hover:rotate-12 transition-transform" />
                          <span>Generate Secure Proof</span>
                        </div>
                      )}
                    </Button>

                    {/* Progress indicator for the tech nerds */}
                    {proofStatus === "loading" && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-8 grid grid-cols-5 gap-2"
                      >
                        {STEP_ORDER.map((step) => {
                          const idx = STEP_ORDER.indexOf(step);
                          const curIdx = STEP_ORDER.indexOf(currentStep);
                          const isDone = idx < curIdx;
                          const isActive = step === currentStep;
                          return (
                            <div key={step} className="flex flex-col gap-2">
                              <div className={`h-1 rounded-full transition-all duration-500 ${isDone ? "bg-emerald-500" : isActive ? "bg-violet-500 animate-pulse" : "bg-white/10"}`} />
                              <span className={`text-[8px] uppercase tracking-widest text-center font-bold ${isActive ? "text-violet-400" : isDone ? "text-emerald-500" : "text-slate-600"}`}>
                                {step}
                              </span>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}

                    {/* Final Output */}
                    {proofStatus === "done" && proof && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-8 space-y-4"
                      >
                        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <Shield className="w-5 h-5" />
                          </div>
                          <p className="text-sm font-bold text-emerald-400">
                            Cryptographic proof generated and verified against local circuit.
                          </p>
                        </div>
                        <Button
                          onClick={() => downloadProofFiles(proof)}
                          variant="secondary"
                          className="w-full h-14 rounded-2xl border border-white/10 hover:bg-white/5 flex items-center justify-center gap-3"
                        >
                          <Download className="w-5 h-5" />
                          Download Proof Package (.json)
                        </Button>
                      </motion.div>
                    )}

                    {proofStatus === "error" && (
                      <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p>Proof generation failed. Check the console for details.</p>
                      </div>
                    )}
                  </div>
                </AnimatedBorderContainer>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <SpotlightCard className="p-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-6">Security Overview</h3>
            <div className="space-y-1">
              {[
                { label: "Privacy Leaks", value: "None Detected", color: "text-emerald-400" },
                { label: "Active Proofs", value: proof ? "1 Secure Proof" : "0", color: "text-violet-400" },
                { label: "Circuit Integrity", value: "Verified", color: "text-cyan-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center py-4 border-b border-white/5 last:border-0">
                  <span className="text-slate-400 text-sm">{label}</span>
                  <span className={`text-sm font-bold ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </SpotlightCard>

          <SpotlightCard className="p-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-6">Why use ZK?</h3>
            <div className="space-y-6">
              {[
                { 
                  title: "Selective Disclosure", 
                  text: "Only reveal that you meet a requirement, not your entire history.",
                  icon: <EyeOff className="w-4 h-4 text-violet-400" />
                },
                { 
                  title: "Mathematical Trust", 
                  text: "Proofs are verified by code, removing the need for human trust.",
                  icon: <BrainCircuit className="w-4 h-4 text-cyan-400" />
                },
                { 
                  title: "Self-Sovereign", 
                  text: "You own your data files. We never store them on any server.",
                  icon: <Lock className="w-4 h-4 text-emerald-400" />
                }
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div className="mt-1">{item.icon}</div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200 mb-1">{item.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </SpotlightCard>
        </div>
      </div>
    </div>
  );
}
