"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { REGISTRY_CONTRACT, formatThreshold, etherscanTx, shortenAddress } from "@/lib/contract";
import { useToast } from "@/components/ToastProvider";
import { CheckCircle, XCircle, Loader2, ExternalLink, AlertCircle, Upload, ShieldCheck, Database, Zap } from "lucide-react";
import type { GeneratedProof } from "@/lib/snarkjs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { AnimatedBorderContainer } from "@/components/ui/AnimatedBorderContainer";
import { motion, AnimatePresence } from "framer-motion";

type VerifyState = "idle" | "loading" | "success" | "fail" | "error";

export default function VerifyPage() {
  const { isConnected } = useAccount();
  const { toast } = useToast();

  const [holderAddress, setHolderAddress] = useState("");
  const [threshold, setThreshold]         = useState(800); // 8.00
  const [proof, setProof]                 = useState<GeneratedProof | null>(null);
  const [attestationUID, setAttestationUID] = useState("");
  const [easSignature, setEasSignature]   = useState("");
  const [verifyState, setVerifyState]     = useState<VerifyState>("idle");

  const { writeContractAsync, data: txHash } = useWriteContract();
  const { isLoading: isTxPending } = useWaitForTransactionReceipt({ hash: txHash });

  const { data: qualification } = useReadContract({
    ...REGISTRY_CONTRACT,
    functionName: "checkQualification",
    args: holderAddress.startsWith("0x")
      ? [holderAddress as `0x${string}`, BigInt(threshold)]
      : undefined,
    query: { enabled: holderAddress.length === 42 },
  });

  const loadProofFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        setProof(JSON.parse(ev.target?.result as string));
        toast("Proof loaded successfully", "success");
      } catch {
        toast("Invalid proof JSON file", "error");
      }
    };
    reader.readAsText(file);
  };

  const handleVerify = async () => {
    if (!proof) return toast("Proof file is missing", "error");
    if (!attestationUID.startsWith("0x")) return toast("Attestation UID required", "error");
    if (!easSignature.startsWith("0x")) return toast("Signature required", "error");

    setVerifyState("loading");
    
    try {
      const hash = await writeContractAsync({
        ...REGISTRY_CONTRACT,
        functionName: "verifyCredential",
        args: [
          proof.calldata.pA,
          proof.calldata.pB,
          proof.calldata.pC,
          proof.calldata.pubSignals,
          attestationUID as `0x${string}`,
          easSignature as `0x${string}`,
        ],
      });

      setVerifyState("success");
      toast("Credential verified on-chain", "success", hash);
    } catch (err: any) {
      setVerifyState("fail");
      const msg = err?.message || "";
      if (msg.includes("InvalidProof")) toast("ZK Proof verification failed", "error");
      else toast("Verification transaction failed", "error");
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-32 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="relative mb-8">
          <div className="absolute -inset-4 bg-cyan-500/20 blur-3xl rounded-full" />
          <Database className="w-20 h-20 text-cyan-500 relative z-10" />
        </div>
        <h1 className="text-5xl font-bold mb-4 tracking-tight">Employer Verification</h1>
        <p className="text-slate-400 mb-10 max-w-md text-center text-lg leading-relaxed">
          Connect your wallet to verify candidate credentials directly against the ZK Registry.
        </p>
        <ConnectButton />
      </div>
    );
  }

  const existingQualified = qualification?.[0];
  const existingRecord    = qualification?.[1];

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-widest mb-4">
          <ShieldCheck className="w-3.5 h-3.5" /> Trustless Verification
        </div>
        <h1 className="text-4xl font-bold mb-3 tracking-tight">Verify On-Chain Credentials</h1>
        <p className="text-slate-400 text-lg leading-relaxed max-w-3xl">
          Validate candidate proofs without ever seeing their private data. The registry confirms if they meet your threshold based on university-signed attestations.
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-[1fr,360px] gap-8 items-start">
        <div className="space-y-8">
          {/* Quick Check */}
          <SpotlightCard className="p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Qualified Check
            </h2>
            <div className="grid gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300 ml-1">Candidate Address</label>
                <input
                  value={holderAddress} onChange={(e) => setHolderAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-[#0F121D]/50 border border-white/5 rounded-2xl px-5 py-4 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/40 transition-all placeholder:text-slate-700"
                />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end px-1">
                  <label className="text-sm font-semibold text-slate-300">Minimum CGPA Threshold</label>
                  <span className="text-2xl font-black text-cyan-400">{(threshold / 100).toFixed(2)}</span>
                </div>
                <input
                  type="range" min={600} max={950} step={10} value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full accent-cyan-500 h-2 bg-white/5 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                  <span>Entry (6.0)</span>
                  <span>Elite (9.5)</span>
                </div>
              </div>

              <AnimatePresence>
                {holderAddress.length === 42 && existingRecord && (existingRecord as any).isVerified && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className={`p-6 rounded-2xl border ${existingQualified ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}
                  >
                    <div className={`flex items-center gap-2 font-bold mb-2 text-lg ${existingQualified ? "text-emerald-400" : "text-red-400"}`}>
                      {existingQualified ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                      {existingQualified ? "Qualified" : "Below Threshold"}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Stored Proof: {formatThreshold((existingRecord as any).threshold)} threshold | Verified at Block #{(existingRecord as any).blockNumber?.toString()}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </SpotlightCard>

          {/* New Verification */}
          <SpotlightCard className="p-8">
            <h2 className="text-xl font-bold mb-2">New Verification Batch</h2>
            <p className="text-sm text-slate-500 mb-8">Submit a new ZK proof to the registry to unlock candidate qualification status.</p>

            <div className="space-y-6">
              <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-3xl p-10 cursor-pointer transition-all ${proof ? "border-emerald-500/40 bg-emerald-500/5" : "border-white/5 hover:border-cyan-500/40 hover:bg-cyan-500/5 group"}`}>
                {proof ? (
                  <>
                    <CheckCircle className="w-10 h-10 text-emerald-500 mb-3" />
                    <span className="text-emerald-400 font-bold">Proof file loaded</span>
                    <span className="text-xs text-emerald-500/60 mt-1 font-mono">{(proof as any).protocol} verified</span>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6 text-slate-400" />
                    </div>
                    <span className="text-slate-300 font-semibold">Drop proof.json here</span>
                    <span className="text-xs text-slate-500 mt-1">Generated by candidate ZK circuit</span>
                  </>
                )}
                <input type="file" accept=".json" className="hidden" onChange={loadProofFile} />
              </label>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 ml-1">Attestation UID</label>
                  <input
                    value={attestationUID} onChange={(e) => setAttestationUID(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-[#0F121D]/50 border border-white/5 rounded-2xl px-5 py-4 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/40 transition-all placeholder:text-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 ml-1">University Signature</label>
                  <input
                    value={easSignature} onChange={(e) => setEasSignature(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-[#0F121D]/50 border border-white/5 rounded-2xl px-5 py-4 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/40 transition-all placeholder:text-slate-800"
                  />
                </div>
              </div>

              <Button
                variant="shiny"
                onClick={handleVerify}
                disabled={verifyState === "loading" || isTxPending || !proof}
                className="w-full py-8 text-lg font-bold"
              >
                {verifyState === "loading" || isTxPending ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Committing to Chain...</>
                ) : (
                  "Verify & Register Status"
                )}
              </Button>
            </div>
          </SpotlightCard>

          <AnimatePresence>
            {verifyState === "success" && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <AnimatedBorderContainer className="p-1 rounded-3xl" glowColor="rgba(16, 185, 129, 0.5)">
                  <div className="bg-[#0A0E1A] rounded-[calc(1.5rem-1px)] p-12 text-center">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h3 className="text-3xl font-black text-emerald-400 mb-3 tracking-tighter uppercase">Verification Successful</h3>
                    <p className="text-slate-400 text-lg mb-8">The candidate has been officially registered as Qualified on-chain.</p>
                    {txHash && (
                      <Button variant="outline" asChild>
                        <a href={etherscanTx(txHash)} target="_blank" rel="noreferrer" className="font-mono text-sm">
                          {shortenAddress(txHash)} <ExternalLink className="w-4 h-4 ml-2" />
                        </a>
                      </Button>
                    )}
                  </div>
                </AnimatedBorderContainer>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-6">
          <Card className="border-white/5 bg-[#0A0E1A]/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xs uppercase tracking-widest text-slate-500 font-bold">Process State</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {[
                { label: "Proof Uploaded",   done: !!proof },
                { label: "Args Serialized",  done: verifyState !== "idle" },
                { label: "Sepolia Tx Sent",   done: !!txHash },
                { label: "Registry Updated", done: verifyState === "success" },
              ].map(({ label, done }) => (
                <div key={label} className="flex items-center gap-3 py-4 border-b border-white/5 last:border-0">
                  <div className={`w-2 h-2 rounded-full transition-all duration-500 ${done ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" : "bg-white/10"}`} />
                  <span className={`text-xs font-bold uppercase tracking-tight ${done ? "text-cyan-400" : "text-slate-600"}`}>{label}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/5 bg-[#0A0E1A]/50 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-cyan-500/10 blur-3xl rounded-full" />
            <CardHeader className="pb-4">
              <CardTitle className="text-xs uppercase tracking-widest text-slate-500 font-bold">Privacy Matrix</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-emerald-500/70 uppercase tracking-widest mb-2">Zero-Knowledge Mask</p>
                {["Actual GPA", "University Name", "Student ID"].map((item) => (
                  <div key={item} className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>{item}</span>
                    <span className="text-emerald-500/50">SHIELDED</span>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-white/5">
                <p className="text-[10px] font-black text-cyan-500/70 uppercase tracking-widest mb-2">Revealed to Contract</p>
                <div className="flex items-center justify-between text-[11px] text-slate-300 font-bold">
                  <span>GP ≥ {(threshold / 100).toFixed(2)}</span>
                  <span className="text-cyan-400">VERIFIED</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
