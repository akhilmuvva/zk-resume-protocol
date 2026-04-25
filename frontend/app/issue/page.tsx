"use client";

import { useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ethers } from "ethers";
import { createOffchainAttestation, downloadAttestation, type SignedAttestation } from "@/lib/eas";
import { useToast } from "@/components/ToastProvider";
import { Copy, Download, CheckCircle, AlertCircle, Loader2, Database, ShieldCheck, GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { AnimatedBorderContainer } from "@/components/ui/AnimatedBorderContainer";
import { motion, AnimatePresence } from "framer-motion";

type FormState = { studentId: string; degree: string; cgpa: string; year: string; studentWallet: string };
type Status = "idle" | "loading" | "done" | "error";

const YEARS = ["2025", "2024", "2023", "2022", "2021", "2020"];

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
      toast("Attestation signed successfully!", "success");
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
      <div className="max-w-7xl mx-auto px-6 py-32 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="relative mb-8">
          <div className="absolute -inset-4 bg-violet-500/20 blur-3xl rounded-full" />
          <ShieldCheck className="w-20 h-20 text-violet-500 relative z-10" />
        </div>
        <h1 className="text-5xl font-bold mb-4 tracking-tight">Issue Academic Credentials</h1>
        <p className="text-slate-400 mb-10 max-w-md text-center text-lg leading-relaxed">
          Connect your authorized university wallet to sign gasless credentials on the EAS protocol.
        </p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 flex items-end justify-between flex-wrap gap-6"
      >
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold uppercase tracking-widest mb-4">
            <GraduationCap className="w-3.5 h-3.5" /> Issuer Portal
          </div>
          <h1 className="text-4xl font-bold mb-3 tracking-tight">Issue Academic Attestation</h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Create cryptographically signed, gasless credentials for students. These attestations are stored off-chain but remain verifiable on-chain.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs text-slate-500 uppercase font-bold tracking-tighter">Status</span>
            <span className="text-emerald-400 font-medium flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </span>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-[1fr,360px] gap-8 items-start">
        {/* Main Content Area */}
        <div className="space-y-8">
          <SpotlightCard className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 ml-1">Student Wallet Address</label>
                  <input
                    required value={form.studentWallet} onChange={update("studentWallet")}
                    placeholder="0x..."
                    className="w-full bg-[#0F121D]/50 border border-white/5 rounded-2xl px-5 py-4 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/40 transition-all placeholder:text-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 ml-1">Student ID (Internal)</label>
                  <input
                    required value={form.studentId} onChange={update("studentId")}
                    placeholder="0x72a5..."
                    className="w-full bg-[#0F121D]/50 border border-white/5 rounded-2xl px-5 py-4 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/40 transition-all placeholder:text-slate-700"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-semibold text-slate-300 ml-1">Degree Name</label>
                  <input
                    required value={form.degree} onChange={update("degree")}
                    placeholder="B.S. Computer Science"
                    className="w-full bg-[#0F121D]/50 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/40 transition-all placeholder:text-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 ml-1">Graduation Year</label>
                  <select
                    value={form.year} onChange={update("year")}
                    className="w-full bg-[#0F121D] border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/40 transition-all cursor-pointer appearance-none"
                  >
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end mb-1 px-1">
                  <label className="text-sm font-semibold text-slate-300">CGPA Performance</label>
                  <span className="text-xs text-slate-500">Range: 0.00 – 10.00</span>
                </div>
                <input
                  required type="number" step="0.01" min="0" max="10"
                  value={form.cgpa} onChange={update("cgpa")} placeholder="9.50"
                  className="w-full bg-[#0F121D]/50 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/40 transition-all placeholder:text-slate-700 text-xl font-bold"
                />
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mt-2 ml-1">Stored as integer (×100) for ZK circuit compatibility</p>
              </div>

              <Button
                type="submit"
                variant="shiny"
                className="w-full py-8 text-lg font-bold"
                disabled={status === "loading"}
              >
                {status === "loading" ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Signing Credential...</>
                ) : (
                  "Generate Off-chain Attestation"
                )}
              </Button>
            </form>
          </SpotlightCard>

          <AnimatePresence>
            {status === "done" && attestation && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <AnimatedBorderContainer className="p-1 rounded-3xl" glowColor="rgba(139, 92, 246, 0.5)">
                  <div className="bg-[#0A0E1A] rounded-[calc(1.5rem-1px)] p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
                          <CheckCircle className="w-6 h-6" /> Attestation Successfully Issued
                        </div>
                        <p className="text-slate-500 text-sm">Download this JSON and share it with the student for ZK proof generation.</p>
                      </div>
                      <div className="flex gap-3">
                        <Button onClick={copyJSON} variant="outline" className="h-10 px-4">
                          {copied ? <><CheckCircle className="w-4 h-4 text-emerald-400" /> Copied</> : <><Copy className="w-4 h-4" /> Copy JSON</>}
                        </Button>
                        <Button onClick={() => downloadAttestation(attestation)} className="h-10 px-4 bg-violet-600 hover:bg-violet-500">
                          <Download className="w-4 h-4 mr-2" /> Download File
                        </Button>
                      </div>
                    </div>
                    
                    <div className="relative group">
                      <div className="absolute inset-0 bg-violet-500/5 blur-xl group-hover:bg-violet-500/10 transition-colors" />
                      <pre className="relative bg-black/40 rounded-2xl p-6 text-xs text-cyan-400 font-mono overflow-x-auto max-h-72 border border-white/5 scrollbar-hide">
                        {JSON.stringify(attestation, null, 2)}
                      </pre>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-6">
                      {["No Gas Cost", "EAS v1.0", `UID: ${attestation.uid.slice(0, 18)}...`].map((tag) => (
                        <div key={tag} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-[11px] font-bold uppercase tracking-tighter">
                          {tag}
                        </div>
                      ))}
                    </div>
                  </div>
                </AnimatedBorderContainer>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="border-white/5 bg-[#0A0E1A]/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Database className="w-4 h-4 text-cyan-400" />
                <CardTitle className="text-sm uppercase tracking-widest text-slate-400 font-bold">EAS Protocol</CardTitle>
              </div>
              <CardDescription>Schema definition for academic credentials.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                <pre className="text-xs font-mono text-cyan-300 leading-relaxed">
{`{
  "studentId": "bytes32",
  "cgpa":      "uint256",
  "degree":    "string"
}`}
                </pre>
              </div>
              <div className="mt-6 pt-6 border-t border-white/5">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Active Schema UID</p>
                <p className="text-[10px] font-mono text-slate-400 break-all bg-white/5 p-3 rounded-lg border border-white/5">
                  {process.env.NEXT_PUBLIC_SCHEMA_UID || "Not configured"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/5 bg-[#0A0E1A]/50 backdrop-blur-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 blur-3xl -mr-16 -mt-16 rounded-full" />
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4 text-violet-400" />
                <CardTitle className="text-sm uppercase tracking-widest text-slate-400 font-bold">Circuit Mapping</CardTitle>
              </div>
              <CardDescription>How this data feeds into ZK circuits.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {[
                ["cgpa", "Private input"],
                ["studentId", "Salted hash"],
                ["threshold", "Public param"],
                ["proof", "SNARK verify"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-[11px] py-3 border-b border-white/5 last:border-0 group">
                  <span className="font-mono text-violet-400 group-hover:text-violet-300 transition-colors">{k}</span>
                  <span className="text-slate-500 font-medium">{v}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
