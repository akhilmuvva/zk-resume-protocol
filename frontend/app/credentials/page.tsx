"use client";

import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { generateProof, downloadProofFiles, buildProofInputFromAttestation, type ProofStep, type GeneratedProof } from "@/lib/snarkjs";
import { shortenAddress } from "@/lib/contract";
import { useToast } from "@/components/ToastProvider";
import { Copy, Upload, Download, Shield, Lock, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import type { SignedAttestation } from "@/lib/eas";

type CredStatus = "idle" | "loading" | "done" | "error";

const STEP_LABELS: Record<ProofStep, string> = {
  idle:      "Waiting...",
  hashing:   "Computing Poseidon hash...",
  witness:   "Generating witness...",
  proving:   "Formatting calldata...",
  verifying: "Verifying locally...",
  done:      "Proof ready!",
  error:     "Error",
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

  // Upload attestation JSON
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        setAttestation(parsed);
        toast("Attestation loaded successfully", "success");
      } catch {
        toast("Invalid attestation file", "error");
      }
    };
    reader.readAsText(file);
  };

  // Generate ZK proof
  const handleGenerateProof = useCallback(async () => {
    if (!attestation) return;
    setProofStatus("loading");
    setProof(null);

    try {
      const input = buildProofInputFromAttestation(attestation, threshold);
      const result = await generateProof(input, (step, msg) => {
        setCurrentStep(step);
        if (msg) toast(msg, "info");
      });
      setProof(result);
      setProofStatus("done");
      toast("Zero-knowledge proof generated!", "success");
    } catch (err: any) {
      setProofStatus("error");
      toast(err.message || "Proof generation failed", "error");
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
      <div className="max-w-7xl mx-auto px-6 py-24 text-center">
        <h1 className="text-4xl font-bold mb-4">My ZK Credentials</h1>
        <p className="text-slate-400 mb-10">Connect your wallet to manage your credentials.</p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-10 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2">My ZK Credentials</h1>
          <p className="text-slate-400">Generate and manage your zero-knowledge proofs.</p>
        </div>
        <button
          onClick={copyAddress}
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass text-sm font-mono text-slate-400 hover:text-white transition-colors"
        >
          {shortenAddress(address || "")}
          <Copy className="w-4 h-4" />
          {copied && <span className="text-emerald-400 text-xs">Copied!</span>}
        </button>
      </div>

      <div className="grid lg:grid-cols-[1fr,360px] gap-8">
        {/* ── Main Panel ─────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Upload Attestation */}
          <div className="glass p-8">
            <h2 className="font-bold text-lg mb-2">Load Attestation</h2>
            <p className="text-slate-400 text-sm mb-6">
              Upload the <code className="text-violet-400 bg-violet-500/10 px-1 rounded">attestation.json</code> file provided by your university.
            </p>

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl p-10 cursor-pointer hover:border-violet-500/50 transition-colors group">
              <Upload className="w-10 h-10 text-slate-600 group-hover:text-violet-400 mb-3 transition-colors" />
              <span className="text-slate-400 text-sm">Drop attestation.json or click to browse</span>
              <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
            </label>

            {attestation && (
              <div className="mt-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-300">Attestation loaded</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">UID: {attestation.uid?.slice(0, 20)}...</p>
                </div>
              </div>
            )}
          </div>

          {/* Credential Card */}
          {attestation && (
            <div className="glass p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 font-bold text-sm">
                  {attestation.meta.university?.slice(2, 4).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{attestation.decodedData.degree}</h3>
                  <p className="text-slate-400 text-sm font-mono">{shortenAddress(attestation.meta.university || "")}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/3 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">CGPA</p>
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-violet-400" />
                    <span className="font-mono text-sm text-slate-400 tracking-widest">█████ PRIVATE</span>
                  </div>
                </div>
                <div className="bg-white/3 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">Status</p>
                  <span className="text-emerald-400 text-sm font-semibold">Attested ✓</span>
                </div>
              </div>

              {/* Threshold Selector */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Proof Threshold (employer minimum)</span>
                  <span className="text-violet-400 font-bold">{(threshold / 100).toFixed(2)}</span>
                </div>
                <input
                  type="range" min={600} max={950} step={10} value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full accent-violet-500"
                />
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>6.00</span><span>9.50</span>
                </div>
              </div>

              {/* Generate Proof Button */}
              <button
                onClick={handleGenerateProof}
                disabled={proofStatus === "loading"}
                className="w-full py-4 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-violet-500/30"
              >
                {proofStatus === "loading" ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> {STEP_LABELS[currentStep]}</>
                ) : (
                  <><Shield className="w-5 h-5" /> Generate ZK Proof</>
                )}
              </button>

              {/* Progress Steps */}
              {proofStatus === "loading" && (
                <div className="mt-6 space-y-3">
                  {STEP_ORDER.map((step) => {
                    const idx = STEP_ORDER.indexOf(step);
                    const curIdx = STEP_ORDER.indexOf(currentStep);
                    const done = idx < curIdx;
                    const active = step === currentStep;
                    return (
                      <div key={step} className={`flex items-center gap-3 transition-opacity ${active || done ? "opacity-100" : "opacity-30"}`}>
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 transition-all ${done ? "bg-emerald-400" : active ? "bg-violet-400 animate-pulse" : "border border-white/20"}`} />
                        <span className={`text-sm ${active ? "text-white" : done ? "text-emerald-400" : "text-slate-500"}`}>
                          {STEP_LABELS[step]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Download Buttons */}
              {proofStatus === "done" && proof && (
                <div className="mt-6 space-y-3">
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                    <CheckCircle className="w-5 h-5" /> Proof verified locally — ready for on-chain submission
                  </div>
                  <button
                    onClick={() => downloadProofFiles(proof)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-sm transition-colors"
                  >
                    <Download className="w-4 h-4" /> Download proof.json + public.json
                  </button>
                </div>
              )}

              {proofStatus === "error" && (
                <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> Proof generation failed. Check circuit artifacts in /public/circuits/.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar ────────────────────────────────────────────── */}
        <div className="space-y-6">
          <div className="glass p-6">
            <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-4">Privacy Stats</h3>
            {[
              { label: "Data Leaked",    value: "0 bytes", color: "text-emerald-400" },
              { label: "Proofs Ready",   value: proof ? "1" : "0", color: "text-violet-400" },
              { label: "Privacy Level",  value: "Maximum", color: "text-cyan-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
                <span className="text-slate-400 text-sm">{label}</span>
                <span className={`font-bold ${color}`}>{value}</span>
              </div>
            ))}
          </div>

          <div className="glass p-6">
            <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-4">How ZK Works</h3>
            <div className="space-y-4 text-xs text-slate-400 leading-relaxed">
              <p><span className="text-violet-400 font-semibold">1. Private Input:</span> Your CGPA is loaded locally into the circuit.</p>
              <p><span className="text-violet-400 font-semibold">2. Constraint:</span> Circuit proves cgpa ≥ threshold mathematically.</p>
              <p><span className="text-violet-400 font-semibold">3. Proof:</span> A 256-byte cryptographic proof is generated.</p>
              <p><span className="text-violet-400 font-semibold">4. Verify:</span> Anyone can verify the proof without seeing your CGPA.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
