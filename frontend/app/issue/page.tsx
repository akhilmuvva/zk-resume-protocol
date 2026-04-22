"use client";

import { useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ethers } from "ethers";
import { createOffchainAttestation, downloadAttestation, type SignedAttestation } from "@/lib/eas";
import { useToast } from "@/components/ToastProvider";
import { Copy, Download, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type FormState = { studentId: string; degree: string; cgpa: string; year: string; studentWallet: string };
type Status = "idle" | "loading" | "done" | "error";

const YEARS = ["2025", "2024", "2023", "2022", "2021", "2020"];

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass p-8 ${className}`}>{children}</div>;
}

export default function IssuePage() {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { toast } = useToast();

  const [form, setForm] = useState<FormState>({ studentId: "", degree: "", cgpa: "", year: "2024", studentWallet: "" });
  const [status, setStatus] = useState<Status>("idle");
  const [attestation, setAttestation] = useState<SignedAttestation | null>(null);
  const [copied, setCopied] = useState(false);

  const update = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletClient) return;
    setStatus("loading");

    try {
      const provider = new ethers.BrowserProvider(walletClient as any);
      const signer   = await provider.getSigner();

      const cgpaNum = Math.round(parseFloat(form.cgpa) * 100);
      if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 1000) throw new Error("CGPA must be between 0.00 and 10.00");
      if (!form.studentWallet.startsWith("0x")) throw new Error("Student wallet must be a valid address");

      // Pad studentId to bytes32
      const studentIdHex = form.studentId.startsWith("0x")
        ? form.studentId.padEnd(66, "0").slice(0, 66)
        : ("0x" + form.studentId).padEnd(66, "0").slice(0, 66);

      const result = await createOffchainAttestation(
        { studentId: studentIdHex, cgpa: cgpaNum, degree: form.degree, studentWallet: form.studentWallet },
        signer
      );

      setAttestation(result);
      setStatus("done");
      toast("Attestation signed successfully! (Gasless ✓)", "success");
    } catch (err: any) {
      setStatus("error");
      toast(err.message || "Attestation failed", "error");
    }
  };

  const copyJSON = async () => {
    if (!attestation) return;
    await navigator.clipboard.writeText(JSON.stringify(attestation, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 text-center">
        <h1 className="text-4xl font-bold mb-4">Issue Academic Attestation</h1>
        <p className="text-slate-400 mb-10">Connect your university wallet to sign credentials.</p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Page Header */}
      <div className="mb-10 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2">Issue Academic Attestation</h1>
          <p className="text-slate-400">Create a signed, gasless credential for a student via EAS.</p>
        </div>
        <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium">
          <CheckCircle className="w-4 h-4" /> University Mode
        </span>
      </div>

      <div className="grid lg:grid-cols-[1fr,340px] gap-8">
        {/* ── Form ──────────────────────────────────────────────── */}
        <div className="space-y-6">
          <GlassCard>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Student Wallet Address</label>
                <input
                  required value={form.studentWallet} onChange={update("studentWallet")}
                  placeholder="0x..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Student ID (bytes32)</label>
                <input
                  required value={form.studentId} onChange={update("studentId")}
                  placeholder="0x72a5..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Degree Name</label>
                  <input
                    required value={form.degree} onChange={update("degree")}
                    placeholder="B.S. Computer Science"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Graduation Year</label>
                  <select
                    value={form.year} onChange={update("year")}
                    className="w-full bg-[#10162A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors"
                  >
                    {YEARS.map((y) => <option key={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">CGPA (0.00 – 10.00)</label>
                <input
                  required type="number" step="0.01" min="0" max="10"
                  value={form.cgpa} onChange={update("cgpa")} placeholder="9.50"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors"
                />
                <p className="text-xs text-slate-500 mt-1">Stored as integer ×100 in the ZK circuit (e.g. 9.50 → 950)</p>
              </div>
              <button
                type="submit" disabled={status === "loading"}
                className="w-full py-4 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-all flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-violet-500/30"
              >
                {status === "loading" ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Signing Attestation...</>
                ) : (
                  "Generate Off-chain Attestation"
                )}
              </button>
            </form>
          </GlassCard>

          {/* Output */}
          {status === "done" && attestation && (
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <CheckCircle className="w-5 h-5" /> Attestation Ready
                </div>
                <div className="flex gap-2">
                  <button onClick={copyJSON} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors">
                    {copied ? <><CheckCircle className="w-4 h-4 text-emerald-400" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
                  </button>
                  <button onClick={() => downloadAttestation(attestation)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 text-sm transition-colors">
                    <Download className="w-4 h-4" /> Download
                  </button>
                </div>
              </div>
              <pre className="bg-black/30 rounded-xl p-4 text-xs text-cyan-300 font-mono overflow-x-auto max-h-64">
                {JSON.stringify(attestation, null, 2)}
              </pre>
              <div className="flex flex-wrap gap-2 mt-4">
                {["Gasless ✓", "EAS Signed ✓", `UID: ${attestation.uid.slice(0, 14)}...`].map((b) => (
                  <span key={b} className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">{b}</span>
                ))}
              </div>
            </GlassCard>
          )}

          {status === "error" && (
            <div className="glass p-4 border-red-500/30 flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              Attestation failed. Check console for details.
            </div>
          )}
        </div>

        {/* ── Schema Sidebar ─────────────────────────────────────── */}
        <div className="space-y-6">
          <GlassCard>
            <h3 className="font-bold mb-4 text-sm text-slate-400 uppercase tracking-wider">EAS Schema</h3>
            <pre className="text-xs font-mono text-cyan-300 leading-relaxed">
{`{
  "studentId": "bytes32",
  "cgpa":      "uint256",
  "degree":    "string"
}`}
            </pre>
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-xs text-slate-500">Schema UID</p>
              <p className="text-xs font-mono text-slate-400 break-all mt-1">
                {process.env.NEXT_PUBLIC_SCHEMA_UID || "Not configured — add SCHEMA_UID to .env"}
              </p>
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="font-bold mb-4 text-sm text-slate-400 uppercase tracking-wider">Circuit Input Mapping</h3>
            {[
              ["cgpa (private)", "CGPA × 100"],
              ["studentId (private)", "bytes32 → field"],
              ["threshold (public)", "Employer sets this"],
              ["studentIdHash (public)", "Poseidon(studentId)"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs py-2 border-b border-white/5 last:border-0">
                <span className="font-mono text-violet-400">{k}</span>
                <span className="text-slate-500">{v}</span>
              </div>
            ))}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
