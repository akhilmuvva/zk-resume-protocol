"use client";

import { useState, useRef, useEffect, DragEvent, ChangeEvent } from "react";
import { logger } from "@/lib/logger";
import { ATSScoreRing } from "@/components/ATSScoreRing";
import { SkillGapChart } from "@/components/SkillGapChart";
import { analyzeResume, ATSResult } from "@/lib/analyze";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Cpu, Shield, Search, Download, ExternalLink, Zap, Target } from "lucide-react";
import { animate, stagger } from "animejs";
import { useWriteContract, useSignMessage } from "wagmi";
import { REGISTRY_CONTRACT } from "@/lib/contract";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { AnimatedBorderContainer } from "@/components/ui/AnimatedBorderContainer";
import { motion, AnimatePresence } from "framer-motion";

// @ts-ignore
import { buildPoseidon } from "circomlibjs";

export default function AnalyzePage() {
  const [mode, setMode] = useState<"student" | "employer">("student");
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ATSResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [zkHash, setZkHash] = useState<string | null>(null);
  const [candidateAddress, setCandidateAddress] = useState("");
  const [isBinding, setIsBinding] = useState(false);
  const [bindSuccess, setBindSuccess] = useState(false);
  const [recordSuccess, setRecordSuccess] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiStatus, setAiStatus] = useState("");

  const { writeContractAsync, isPending: isWriting } = useWriteContract();
  const { signMessageAsync } = useSignMessage();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
      } else {
        setError("Please upload a PDF file.");
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const [ipfsCID, setIpfsCID] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!file) {
      setError("Please upload a resume PDF.");
      return;
    }
    if (mode === "employer" && !jobDescription.trim()) {
      setError("Please provide a Job Description.");
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    setResult(null);
    setZkHash(null);
    setIpfsCID(null);

    try {
      const { extractTextFromPDF, analyzeResumeLocally } = await import("@/lib/local-ai");
      const text = await extractTextFromPDF(file);
      
      if (!text || text.trim().length === 0) {
        throw new Error("Could not extract text from PDF.");
      }

      const atsResult = await analyzeResumeLocally(text, jobDescription, (p: any) => {
        if (p.status === "progress") setAiProgress(p.progress);
        if (p.status === "initiate") setAiStatus(`Initializing ${p.file}`);
        if (p.status === "download") setAiStatus(`Downloading model weights`);
        if (p.status === "done") setAiStatus("Analysis starting...");
      });
      setResult(atsResult as any);
      setIpfsCID(atsResult.ipfsCID);

      if (mode === "student") {
        try {
          const poseidon = await buildPoseidon();
          const generalScoreBig = BigInt(atsResult.generalScore);
          const timestampBig = BigInt(Date.now());
          const hash = poseidon([generalScoreBig, timestampBig]);
          const hashHex = "0x" + BigInt(poseidon.F.toString(hash)).toString(16).padStart(64, '0');
          setZkHash(hashHex);
        } catch (e) {
          logger.error("Poseidon hashing failed:", e);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to analyze resume.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBindEAS = async () => {
    if (!zkHash) return;
    setIsBinding(true);
    try {
      await signMessageAsync({ message: `Fingerprint:\n${zkHash}` });
      setBindSuccess(true);
    } catch(err) {
      logger.error("EAS Binding failed:", err);
      setError("Binding failed. See console for details.");
    } finally {
      setIsBinding(false);
    }
  };

  const handleRecordVerdict = async () => {
    if (!candidateAddress || !result || !ipfsCID) return;
    try {
      await writeContractAsync({
        ...REGISTRY_CONTRACT,
        functionName: "recordATSVerdict",
        args: [
          candidateAddress as `0x${string}`,
          result.qualified || false,
          BigInt(result.generalScore),
          ipfsCID 
        ]
      });
      setRecordSuccess(true);
    } catch(err) {
      logger.error("Verdict recording failed:", err);
      setError("Transaction failed.");
    }
  };

  useEffect(() => {
    if (result && resultRef.current) {
      const bars = resultRef.current.querySelectorAll('.section-bar-fill');
      animate(bars, {
        width: (el: any) => ((el as HTMLElement).getAttribute('data-score') ?? '0') + '%',
        ease: 'outQuart',
        duration: 1500,
        delay: stagger(100),
      });
    }
  }, [result]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Hero Header */}
      <div className="flex flex-col items-center mb-16 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6"
        >
          <Cpu className="w-3.5 h-3.5" /> Local AI Infrastructure
        </motion.div>
        <h1 className="text-5xl font-black mb-6 tracking-tighter">ATS Intelligence <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Engine</span></h1>
        <p className="text-slate-400 text-lg max-w-2xl leading-relaxed mb-10">
          Analyze your resume against job descriptions using private, local-first AI. No data leaves your browser, ensuring complete privacy before on-chain binding.
        </p>
        
        <div className="flex p-1.5 bg-[#0F121D] border border-white/5 rounded-2xl shadow-2xl">
          <button
            onClick={() => { setMode("student"); setResult(null); setError(null); }}
            className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
              mode === "student" ? "bg-violet-600 text-white shadow-xl shadow-violet-600/20" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Shield className="w-4 h-4" /> Student Portal
          </button>
          <button
            onClick={() => { setMode("employer"); setResult(null); setError(null); }}
            className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
              mode === "employer" ? "bg-cyan-600 text-white shadow-xl shadow-cyan-600/20" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Search className="w-4 h-4" /> Employer Audit
          </button>
        </div>
      </div>

      {/* Upload/Input Section */}
      <div className="grid lg:grid-cols-2 gap-8 mb-16 items-stretch">
        <SpotlightCard className="p-8 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <h2 className="font-bold text-slate-200">Resume Source</h2>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-black">PDF Format Required</p>
            </div>
          </div>
          
          <div
            className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-3xl transition-all ${
              isDragging ? "border-violet-500 bg-violet-500/10" : "border-white/5 bg-black/20 hover:border-white/10 hover:bg-black/40"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{ minHeight: "240px", cursor: "pointer" }}
          >
            <input type="file" accept=".pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            {file ? (
              <div className="text-center p-6">
                <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4 border border-violet-500/20 shadow-lg">
                  <CheckCircle2 className="w-8 h-8 text-violet-400" />
                </div>
                <p className="font-bold text-slate-200 mb-1">{file.name}</p>
                <p className="text-xs text-slate-500 font-mono uppercase">{(file.size / 1024).toFixed(1)} KB • Click to swap</p>
              </div>
            ) : (
              <div className="text-center p-6">
                <UploadCloud className="w-12 h-12 text-slate-700 mb-4 mx-auto" />
                <p className="font-bold text-slate-400">Drag resume PDF here</p>
                <p className="text-xs text-slate-600 mt-2 uppercase tracking-tighter">Local processing only</p>
              </div>
            )}
          </div>
        </SpotlightCard>

        {mode === "employer" ? (
          <SpotlightCard className="p-8 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <h2 className="font-bold text-slate-200">Target Benchmark</h2>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-black">Requirement Context</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Candidate ID</label>
                <input
                  type="text"
                  className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  placeholder="0x..."
                  value={candidateAddress}
                  onChange={(e) => setCandidateAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2 flex-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Job Description</label>
                <textarea
                  className="w-full bg-black/20 border border-white/5 rounded-2xl p-5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-sans text-sm resize-none min-h-[160px]"
                  placeholder="Paste role requirements, tech stack, and responsibilities..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>
            </div>
          </SpotlightCard>
        ) : (
          <Card className="bg-[#0F121D]/50 border-white/5 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-48 h-48 bg-violet-600/10 blur-[80px] -mr-24 -mt-24 rounded-full" />
            <CardHeader>
              <CardTitle className="text-lg font-bold text-violet-400">Student Intelligence</CardTitle>
              <CardDescription>Optimize your resume for decentralized ZK protocols.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { icon: Zap, label: "Readability Scan", desc: "Checks parsing compatibility for ATS." },
                { icon: Target, label: "Skill Extraction", desc: "Maps your experience to industry clusters." },
                { icon: Shield, label: "ZK Privacy", desc: "On-chain binding via content-addressed CID." }
              ].map((item, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-violet-500/10 transition-colors">
                    <item.icon className="w-5 h-5 text-slate-500 group-hover:text-violet-400 transition-colors" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">{item.label}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Action Bar */}
      <div className="flex flex-col items-center mb-20">
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-red-400 bg-red-500/10 px-6 py-4 rounded-2xl mb-8 border border-red-500/20">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-bold">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          variant="shiny"
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="px-12 py-8 text-xl font-black uppercase tracking-tighter"
        >
          {isAnalyzing ? "Processing..." : "Initiate AI Analysis"}
        </Button>

        {isAnalyzing && (
          <div className="mt-12 w-full max-w-xl">
            <div className="flex justify-between items-end mb-3 px-1">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{aiStatus || "Analyzing Content"}</span>
              <span className="text-sm font-black text-violet-400">{Math.round(aiProgress)}%</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
              <motion.div 
                className="h-full bg-gradient-to-r from-violet-600 via-cyan-500 to-violet-600 rounded-full"
                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 3, repeat: Infinity }}
                style={{ width: `${aiProgress}%`, backgroundSize: "200% 100%" }}
              />
            </div>
            <p className="mt-6 text-center text-[10px] text-slate-600 font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-2">
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" /> Zero-Knowledge Execution Environment
            </p>
          </div>
        )}
      </div>

      {/* Results Display */}
      {result && (
        <div ref={resultRef} className="space-y-12">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black tracking-tighter">Analysis <span className="text-violet-400">Insight</span></h2>
            <Button variant="outline" onClick={downloadReport} className="font-mono text-xs border-white/10 hover:bg-white/5">
              <Download className="w-4 h-4 mr-2" /> ats-report.json
            </Button>
          </div>

          <AnimatePresence>
            {mode === "employer" && result.qualified !== undefined && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`w-full py-8 text-center rounded-[2rem] border shadow-2xl relative overflow-hidden ${
                  result.qualified 
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                    : "bg-red-500/10 text-red-400 border-red-500/30"
                }`}
              >
                <div className={`absolute inset-0 opacity-10 ${result.qualified ? "bg-emerald-500" : "bg-red-500"} blur-[100px]`} />
                <h3 className="text-4xl font-black tracking-[0.2em] relative z-10">{result.qualified ? "QUALIFIED" : "FAIL"}</h3>
                <p className="text-xs font-bold uppercase tracking-widest mt-2 relative z-10 opacity-60">Automated On-chain Audit Result</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-8">
              <AnimatedBorderContainer className="p-1 rounded-[2.5rem]" glowColor="rgba(139, 92, 246, 0.4)">
                <div className="bg-[#0A0E1A] rounded-[calc(2.5rem-1px)] p-10 flex flex-col items-center">
                  <div className="flex gap-10 justify-center mb-10 scale-110">
                    <ATSScoreRing score={result.generalScore} label="Overall" color="#8b5cf6" />
                    {mode === "employer" && result.jdMatchScore !== undefined && (
                      <ATSScoreRing score={result.jdMatchScore} label="JD Match" color={result.qualified ? "#10b981" : "#ef4444"} />
                    )}
                  </div>
                  <div className="bg-white/5 rounded-2xl p-6 border border-white/5 relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500/40 to-transparent rounded-full" />
                    <p className="text-slate-300 font-medium leading-relaxed italic text-sm text-center">
                      "{mode === "student" ? result.summary : result.hiringSummary}"
                    </p>
                  </div>
                </div>
              </AnimatedBorderContainer>

              <Card className="bg-[#0F121D]/50 border-white/5 p-8">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-8">Section Breakdown</h3>
                <div className="space-y-8">
                  {[
                    { key: "education", label: "Academic Depth" },
                    { key: "experience", label: "Industry Reach" },
                    { key: "skills", label: "Technical Latency" },
                    { key: "formatting", label: "Structure & Flow" }
                  ].map(({ key, label }) => {
                    const val = result.sections[key as keyof typeof result.sections];
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-[11px] mb-3 px-1">
                          <span className="text-slate-400 font-bold uppercase tracking-tight">{label}</span>
                          <span className="font-black text-white">{val}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="section-bar-fill h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.3)]"
                            style={{ width: "0%" }}
                            data-score={val}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>

            <div className="lg:col-span-7 space-y-8">
              <Card className="bg-[#0F121D]/50 border-white/5 p-8">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-8">Vector Space Analysis</h3>
                <SkillGapChart 
                  matchedKeywords={result.matchedKeywords || result.extractedSkills}
                  missingKeywords={result.missingKeywords}
                  bonusKeywords={result.bonusKeywords}
                />
              </Card>

              <Card className="bg-[#0F121D]/50 border-white/5 p-8">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-8">Evolution Strategy</h3>
                <div className="space-y-4">
                  {result.improvements.map((imp, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, x: 20 }} 
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex gap-4 items-start bg-black/20 p-5 rounded-2xl border border-white/5 group hover:border-violet-500/20 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed group-hover:text-slate-200 transition-colors">{imp}</p>
                    </motion.div>
                  ))}
                </div>
              </Card>

              {mode === "student" && zkHash && (
                <AnimatedBorderContainer className="p-1 rounded-3xl" glowColor="rgba(139, 92, 246, 0.5)">
                  <div className="bg-[#0A0E1A] rounded-[calc(1.5rem-1px)] p-8">
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-violet-400" />
                      Protocol Binding
                    </h3>
                    <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                      Securely link your ATS performance to your on-chain identity. This creates a verifiable content-addressed hash of your report.
                    </p>
                    <div className="grid gap-3 mb-8">
                      <div className="bg-black/40 p-4 rounded-xl border border-white/5 font-mono text-[10px] text-slate-500 flex items-center justify-between group">
                        <span className="truncate mr-4">FINGERPRINT: {zkHash}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 opacity-40" />
                      </div>
                      <div className="bg-black/40 p-4 rounded-xl border border-white/5 font-mono text-[10px] text-violet-400/70 flex items-center justify-between group">
                        <span className="truncate mr-4">IPFS: {ipfsCID}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-violet-500/40" />
                      </div>
                    </div>
                    <Button 
                      onClick={handleBindEAS}
                      disabled={isBinding || bindSuccess}
                      className={`w-full py-6 text-lg font-bold uppercase tracking-tight ${bindSuccess ? "bg-emerald-600" : "bg-violet-600"}`}
                    >
                      {isBinding ? "Processing..." : bindSuccess ? "Identity Bound ✓" : "Commit to EAS Protocol"}
                    </Button>
                  </div>
                </AnimatedBorderContainer>
              )}
              
              {mode === "employer" && result.qualified && (
                 <AnimatedBorderContainer className="p-1 rounded-3xl" glowColor="rgba(16, 185, 129, 0.5)">
                  <div className="bg-[#0A0E1A] rounded-[calc(1.5rem-1px)] p-8">
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-emerald-400">
                      <Target className="w-5 h-5" />
                      Register Verdict
                    </h3>
                    <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                      Formalize this candidate's qualification status in the ResumeRegistry smart contract.
                    </p>
                    <div className="bg-black/40 p-4 rounded-xl border border-emerald-500/10 font-mono text-[10px] text-emerald-500/60 mb-8 truncate">
                      CONTENT-HASH: {ipfsCID}
                    </div>
                    <Button 
                      onClick={handleRecordVerdict}
                      disabled={isWriting || recordSuccess}
                      className={`w-full py-6 text-lg font-bold uppercase tracking-tight ${recordSuccess ? "bg-emerald-700" : "bg-emerald-600"}`}
                    >
                      {isWriting ? "Transacting..." : recordSuccess ? "Recorded On-chain ✓" : "Commit Verdict to Chain"}
                    </Button>
                  </div>
                </AnimatedBorderContainer>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
