"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { REGISTRY_CONTRACT, formatThreshold, etherscanTx, shortenAddress } from "@/lib/contract";
import { useToast } from "@/components/ToastProvider";
import { CheckCircle, XCircle, Loader2, ExternalLink, AlertCircle, Upload } from "lucide-react";
import type { GeneratedProof } from "@/lib/snarkjs";

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

  // On-chain read — check if holder already verified
  const { data: qualification } = useReadContract({
    ...REGISTRY_CONTRACT,
    functionName: "checkQualification",
    args: holderAddress.startsWith("0x")
      ? [holderAddress as `0x${string}`, BigInt(threshold)]
      : undefined,
    query: { enabled: holderAddress.length === 42 },
  });

  // Load proof.json
  const loadProofFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        setProof(JSON.parse(ev.target?.result as string));
        toast("Proof loaded", "success");
      } catch {
        toast("Invalid proof file", "error");
      }
    };
    reader.readAsText(file);
  };

  const handleVerify = async () => {
    if (!proof) return toast("Upload a proof.json first", "error");
    if (!attestationUID.startsWith("0x")) return toast("Invalid attestation UID", "error");
    if (!easSignature.startsWith("0x")) return toast("Invalid EAS signature", "error");

    setVerifyState("loading");
    toast("Submitting to smart contract...", "info");

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

      toast("Transaction sent!", "success", hash);
      setVerifyState("success");
    } catch (err: any) {
      const msg = err?.message || "Transaction failed";
      if (msg.includes("InvalidProof"))          toast("ZK Proof is invalid", "error");
      else if (msg.includes("AttestationAlready")) toast("Attestation already used", "error");
      else if (msg.includes("UniversityNot"))     toast("University not registered", "error");
      else                                         toast(msg.slice(0, 100), "error");
      setVerifyState("fail");
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 text-center">
        <h1 className="text-4xl font-bold mb-4">Verify Credential</h1>
        <p className="text-slate-400 mb-10">Connect your wallet to verify credentials on-chain.</p>
        <ConnectButton />
      </div>
    );
  }

  const existingQualified = qualification?.[0];
  const existingRecord    = qualification?.[1];

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-2">Verify Credential</h1>
        <p className="text-slate-400">Call the smart contract to verify a candidate's ZK proof on-chain.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr,360px] gap-8">
        {/* ── Main Form ────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Quick On-chain Check */}
          <div className="glass p-8">
            <h2 className="font-bold text-lg mb-6">On-chain Qualification Check</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Candidate Wallet Address</label>
                <input
                  value={holderAddress} onChange={(e) => setHolderAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Minimum CGPA Required</span>
                  <span className="text-cyan-400 font-bold">{(threshold / 100).toFixed(2)}</span>
                </div>
                <input
                  type="range" min={600} max={950} step={10} value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>6.00</span><span>9.50</span>
                </div>
              </div>

              {/* Existing on-chain result */}
              {holderAddress.length === 42 && existingRecord && (existingRecord as any).isVerified && (
                <div className={`p-4 rounded-xl border ${existingQualified ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                  <div className={`flex items-center gap-2 font-semibold mb-2 ${existingQualified ? "text-emerald-400" : "text-red-400"}`}>
                    {existingQualified ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    {existingQualified ? "Qualified" : "Does not meet threshold"}
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    On-chain threshold: {formatThreshold((existingRecord as any).threshold)} | Block #{(existingRecord as any).blockNumber?.toString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Full Verification */}
          <div className="glass p-8">
            <h2 className="font-bold text-lg mb-2">Submit New Verification</h2>
            <p className="text-sm text-slate-500 mb-6">Upload proof.json and provide the attestation details to verify on-chain.</p>

            <div className="space-y-4">
              {/* Proof file */}
              <label className={`flex items-center justify-center border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-colors ${proof ? "border-emerald-500/50 bg-emerald-500/5" : "border-white/10 hover:border-cyan-500/50"}`}>
                {proof ? (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm">
                    <CheckCircle className="w-5 h-5" /> proof.json loaded
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Upload className="w-5 h-5" /> Upload proof.json
                  </div>
                )}
                <input type="file" accept=".json" className="hidden" onChange={loadProofFile} />
              </label>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Attestation UID (bytes32)</label>
                <input
                  value={attestationUID} onChange={(e) => setAttestationUID(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">University EAS Signature</label>
                <input
                  value={easSignature} onChange={(e) => setEasSignature(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <button
                onClick={handleVerify}
                disabled={verifyState === "loading" || isTxPending || !proof}
                className="w-full py-4 rounded-2xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-cyan-500/30"
              >
                {verifyState === "loading" || isTxPending ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Verifying On-chain...</>
                ) : (
                  "Verify On-chain"
                )}
              </button>
            </div>
          </div>

          {/* Result Cards */}
          {verifyState === "success" && (
            <div className="glass p-10 text-center border-emerald-500/40 glow-green">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold text-emerald-400 mb-2">Qualified ✓</h3>
              <p className="text-slate-400 mb-6">CGPA meets threshold | Verified on Sepolia</p>
              {txHash && (
                <a href={etherscanTx(txHash)} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-cyan-400 hover:underline font-mono text-sm">
                  {txHash.slice(0, 20)}... <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          )}

          {verifyState === "fail" && (
            <div className="glass p-10 text-center border-red-500/40 glow-red">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-2xl font-bold text-red-400 mb-2">Not Qualified ✗</h3>
              <p className="text-slate-400">Proof invalid or threshold not met</p>
            </div>
          )}
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <div className="space-y-6">
          <div className="glass p-6">
            <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-4">Verification Timeline</h3>
            {[
              { label: "Proof Submitted",   done: verifyState !== "idle" },
              { label: "Contract Called",   done: verifyState === "success" || verifyState === "fail" },
              { label: "Groth16 Verified",  done: verifyState === "success" },
              { label: "Result Stored",     done: verifyState === "success" },
            ].map(({ label, done }) => (
              <div key={label} className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${done ? "bg-emerald-400" : "bg-white/10"}`} />
                <span className={`text-sm ${done ? "text-emerald-400" : "text-slate-500"}`}>{label}</span>
              </div>
            ))}
          </div>

          <div className="glass p-6">
            <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-4">What Stays Private</h3>
            <div className="space-y-2 text-xs text-slate-500">
              {["Actual CGPA value", "Student ID (raw)", "Degree name", "University identity"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <span className="text-emerald-400">✓ Hidden:</span> {item}
                </div>
              ))}
              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="text-cyan-400">↗ Revealed:</span> CGPA ≥ {(threshold / 100).toFixed(2)} (boolean)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
