"use client";

import { useState, useRef, useEffect, DragEvent, ChangeEvent } from "react";
import { ATSScoreRing } from "@/components/ATSScoreRing";
import { SkillGapChart } from "@/components/SkillGapChart";
import { analyzeResume, ATSResult } from "@/lib/analyze";
import { UploadCloud, FileText, CheckCircle2, AlertCircle } from "lucide-react";
// @ts-ignore
import anime from "animejs";
import { useWriteContract, useSignMessage } from "wagmi";
import { REGISTRY_CONTRACT } from "@/lib/contract";

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
      setError("Please provide a Job Description for Employer Mode.");
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    setResult(null);
    setZkHash(null);
    setIpfsCID(null);

    try {
      // 1. Parse PDF LOCALLY (Decentralized)
      const { extractTextFromPDF, analyzeResumeLocally } = await import("@/lib/local-ai");
      const text = await extractTextFromPDF(file);
      
      if (!text || text.trim().length === 0) {
        throw new Error("Could not extract text from PDF locally.");
      }

      // 2. Analyze using Local AI (Decentralized - Transformers.js)
      // This function now handles IPFS simulation internally and returns the CID
      const atsResult = await analyzeResumeLocally(text, jobDescription, (p: any) => {
        if (p.status === "progress") {
          setAiProgress(p.progress);
        }
        if (p.status === "initiate") {
          setAiStatus(`Initializing ${p.file}...`);
        }
        if (p.status === "download") {
          setAiStatus(`Downloading AI model: ${p.file}...`);
        }
        if (p.status === "done") {
          setAiStatus("Model ready!");
        }
      });
      setResult(atsResult as any);
      setIpfsCID(atsResult.ipfsCID);

      // 3. ZK Binding Hash
      if (mode === "student") {
        try {
          const poseidon = await buildPoseidon();
          const generalScoreBig = BigInt(atsResult.generalScore);
          const timestampBig = BigInt(Date.now());
          const hash = poseidon([generalScoreBig, timestampBig]);
          const hashHex = "0x" + BigInt(poseidon.F.toString(hash)).toString(16).padStart(64, '0');
          setZkHash(hashHex);
        } catch (e) {
          console.error("Poseidon hash error:", e);
        }
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during local analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBindEAS = async () => {
    if (!zkHash) return;
    setIsBinding(true);
    setBindSuccess(false);
    try {
      await signMessageAsync({ message: `I attest that my ZK Resume ATS fingerprint is:\n\n${zkHash}` });
      setBindSuccess(true);
    } catch(err) {
      console.error(err);
    } finally {
      setIsBinding(false);
    }
  };

  const handleRecordVerdict = async () => {
    if (!candidateAddress || !result || !ipfsCID) {
      setError("Candidate Address, Result, and IPFS CID are required.");
      return;
    }
    setRecordSuccess(false);
    try {
      await writeContractAsync({
        ...REGISTRY_CONTRACT,
        functionName: "recordATSVerdict",
        args: [
          candidateAddress as `0x${string}`,
          result.qualified || false,
          BigInt(result.generalScore),
          ipfsCID // New decentralized storage parameter
        ]
      });
      setRecordSuccess(true);
    } catch(err) {
      console.error(err);
      setError("Transaction failed. Check console.");
    }
  };

  // Animate section bars when result appears
  useEffect(() => {
    if (result && resultRef.current) {
      const bars = resultRef.current.querySelectorAll('.section-bar-fill');
      anime({
        targets: bars,
        width: function(el: HTMLElement) {
          return el.getAttribute('data-score') + '%';
        },
        easing: 'easeOutQuart',
        duration: 1500,
        delay: anime.stagger(100)
      });
    }
  }, [result]);

  const downloadReport = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ats-report.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Header & Toggle */}
      <div className="flex flex-col items-center mb-12">
        <h1 className="text-4xl font-bold font-syne mb-6 text-center">AI Resume Analyzer</h1>
        <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl">
          <button
            onClick={() => { setMode("student"); setResult(null); setError(null); }}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              mode === "student" ? "bg-violet-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
            }`}
          >
            Student Mode
          </button>
          <button
            onClick={() => { setMode("employer"); setResult(null); setError(null); }}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              mode === "employer" ? "bg-cyan-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
            }`}
          >
            Employer Mode
          </button>
        </div>
      </div>

      {/* Input Area */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* PDF Upload */}
        <div className="flex flex-col">
          <h2 className="text-lg font-bold font-syne mb-4 text-slate-200">Upload Resume</h2>
          <div
            className={`flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl transition-all ${
              isDragging ? "border-violet-500 bg-violet-500/10" : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{ minHeight: "240px", cursor: "pointer" }}
          >
            <input 
              type="file" 
              accept=".pdf" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange}
            />
            {file ? (
              <>
                <FileText className="w-12 h-12 text-violet-400 mb-4" />
                <p className="font-medium text-slate-200 text-center">{file.name}</p>
                <p className="text-sm text-slate-500 mt-2">Click to replace</p>
              </>
            ) : (
              <>
                <UploadCloud className="w-12 h-12 text-slate-500 mb-4" />
                <p className="font-medium text-slate-300 text-center">Drag & Drop your PDF here</p>
                <p className="text-sm text-slate-500 mt-2">or click to browse</p>
              </>
            )}
          </div>
        </div>

        {/* Job Description (Employer Mode Only) */}
        {mode === "employer" ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col">
              <h2 className="text-lg font-bold font-syne mb-2 text-slate-200">Candidate Address</h2>
              <input
                type="text"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-slate-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono text-sm"
                placeholder="0x..."
                value={candidateAddress}
                onChange={(e) => setCandidateAddress(e.target.value)}
              />
            </div>
            <div className="flex flex-col flex-1">
              <h2 className="text-lg font-bold font-syne mb-2 text-slate-200">Job Description</h2>
              <textarea
                className="flex-1 w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-slate-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono text-sm resize-none min-h-[140px]"
                placeholder="Paste the job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col justify-center items-start glass p-8">
            <h3 className="text-lg font-bold font-syne mb-2 text-violet-300">How Student Mode Works</h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" /> Analyzes overall ATS readability.</li>
              <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" /> Extracts skills and compares against industry standards.</li>
              <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" /> Generates actionable improvements.</li>
              <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" /> Binds score to ZK Protocol.</li>
            </ul>
          </div>
        )}
      </div>

      {/* Action Button & Error */}
      <div className="flex flex-col items-center mb-16">
        {error && (
          <div className="flex items-center gap-2 text-red-400 bg-red-500/10 px-4 py-3 rounded-xl mb-6 w-full max-w-lg">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className={`px-8 py-4 rounded-xl font-bold font-syne text-lg transition-all ${
            isAnalyzing 
              ? "bg-slate-800 text-slate-400 cursor-not-allowed" 
              : "bg-white text-black hover:bg-slate-200 hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          }`}
        >
          {isAnalyzing ? "Analyzing Resume..." : "Run ATS Analysis"}
        </button>

        {isAnalyzing && (
          <div className="mt-8 w-full max-w-lg animate-in fade-in zoom-in duration-500">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">{aiStatus || "Processing..."}</span>
              <span className="text-xs font-mono text-violet-400">{Math.round(aiProgress)}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-violet-600 via-cyan-500 to-violet-600 bg-[length:200%_auto] animate-gradient-x transition-all duration-300"
                style={{ width: `${aiProgress}%` }}
              />
            </div>
            <p className="mt-4 text-center text-[10px] text-slate-500 uppercase tracking-[0.2em]">
              Decentralized Inference • No Data Leaves Your Device
            </p>
          </div>
        )}
      </div>

      {/* Results Section */}
      {result && (
        <div ref={resultRef} className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold font-syne">Analysis Results</h2>
            <button onClick={downloadReport} className="text-sm bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg font-mono transition-colors">
              ats-report.json ↓
            </button>
          </div>

          {/* Employer Banner */}
          {mode === "employer" && result.qualified !== undefined && (
            <div className={`w-full py-4 text-center font-black tracking-widest text-xl rounded-xl mb-8 border shadow-lg ${
              result.qualified 
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-emerald-500/20" 
                : "bg-red-500/20 text-red-400 border-red-500/50 shadow-red-500/20"
            }`}>
              {result.qualified ? "QUALIFIED CANDIDATE" : "NOT QUALIFIED"}
            </div>
          )}

          <div className="grid md:grid-cols-12 gap-8">
            {/* Left Col: Scores */}
            <div className="md:col-span-5 flex flex-col gap-8">
              <div className="glass p-8 flex flex-col items-center">
                <div className="flex gap-8 justify-center">
                  <ATSScoreRing score={result.generalScore} label="Overall Score" color="#c084fc" />
                  {mode === "employer" && result.jdMatchScore !== undefined && (
                    <ATSScoreRing score={result.jdMatchScore} label="JD Match" color={result.qualified ? "#4ade80" : "#ef4444"} />
                  )}
                </div>
                <p className="mt-6 text-center text-slate-300 font-medium leading-relaxed">
                  {mode === "student" ? result.summary : result.hiringSummary}
                </p>
                {result.cgpa && <div className="mt-4 px-3 py-1 bg-white/5 rounded text-sm text-slate-400">Extracted CGPA: <span className="text-white font-mono">{result.cgpa}</span></div>}
              </div>

              <div className="glass p-8">
                <h3 className="font-bold font-syne mb-6 text-slate-200">Section Breakdown</h3>
                <div className="space-y-5">
                  {[
                    { key: "education", label: "Education" },
                    { key: "experience", label: "Experience" },
                    { key: "skills", label: "Skills" },
                    { key: "formatting", label: "Formatting" }
                  ].map(({ key, label }) => {
                    const val = result.sections[key as keyof typeof result.sections];
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-400">{label}</span>
                          <span className="font-mono text-white">{val}/100</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="section-bar-fill h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full"
                            style={{ width: "0%" }}
                            data-score={val}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right Col: Keywords & Improvements */}
            <div className="md:col-span-7 flex flex-col gap-8">
              <div className="glass p-8">
                <h3 className="font-bold font-syne mb-6 text-slate-200">Keyword Analysis</h3>
                <SkillGapChart 
                  matchedKeywords={result.matchedKeywords || result.extractedSkills}
                  missingKeywords={result.missingKeywords}
                  bonusKeywords={result.bonusKeywords}
                />
              </div>

              <div className="glass p-8">
                <h3 className="font-bold font-syne mb-4 text-slate-200">Actionable Improvements</h3>
                <ul className="space-y-4">
                  {result.improvements.map((imp, i) => (
                    <li key={i} className="flex gap-3 items-start bg-white/5 p-4 rounded-xl border border-white/5">
                      <div className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">{imp}</p>
                    </li>
                  ))}
                </ul>
              </div>

              {/* ZK Binding Action (Student) */}
              {mode === "student" && zkHash && (
                <div className="glass p-8 border-violet-500/30">
                  <h3 className="font-bold font-syne mb-2 text-violet-300">Cryptographic Binding</h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Your ATS score can be securely bound to your decentralized ZK credential.
                  </p>
                  <div className="bg-[#0A0E1A] p-3 rounded-lg border border-white/10 font-mono text-xs text-slate-500 break-all mb-2">
                    Resume fingerprint: {zkHash}
                  </div>
                  <div className="bg-[#0A0E1A] p-3 rounded-lg border border-white/10 font-mono text-xs text-violet-500/70 break-all mb-4">
                    IPFS Metadata: {ipfsCID}
                  </div>
                  <button 
                    onClick={handleBindEAS}
                    disabled={isBinding || bindSuccess}
                    className={`w-full py-3 font-medium rounded-lg transition-colors ${
                      bindSuccess 
                        ? "bg-emerald-600 text-white" 
                        : "bg-violet-600 hover:bg-violet-500 text-white"
                    }`}
                  >
                    {isBinding ? "Signing..." : bindSuccess ? "Successfully Bound ✓" : "Bind to EAS Attestation"}
                  </button>
                </div>
              )}
              
              {/* ZK Publish Action (Employer) */}
              {mode === "employer" && result.qualified && (
                 <div className="glass p-8 border-emerald-500/30">
                 <h3 className="font-bold font-syne mb-2 text-emerald-300">On-chain Verification</h3>
                 <p className="text-sm text-slate-400 mb-4">
                   Push this candidate's qualified status directly to the ResumeRegistry smart contract.
                 </p>
                  <div className="bg-[#0A0E1A] p-3 rounded-lg border border-white/10 font-mono text-xs text-emerald-500/70 break-all mb-4">
                    IPFS Metadata: {ipfsCID}
                  </div>
                  <button 
                    onClick={handleRecordVerdict}
                    disabled={isWriting || recordSuccess}
                    className={`w-full py-3 font-medium rounded-lg transition-colors ${
                      recordSuccess 
                        ? "bg-emerald-700 text-emerald-200" 
                        : "bg-emerald-600 hover:bg-emerald-500 text-white"
                    }`}
                  >
                    {isWriting ? "Recording..." : recordSuccess ? "Recorded On-chain ✓" : "Record Verdict On-chain"}
                  </button>
               </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
