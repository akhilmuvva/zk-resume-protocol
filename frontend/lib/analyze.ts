/**
 * analyze.ts — Fully Decentralized Resume Analysis
 * ─────────────────────────────────────────────────────
 * Delegates entirely to the local Transformers.js pipeline.
 * NO backend calls. NO Claude. NO centralized API.
 */

import { analyzeResumeLocally, LocalATSResult } from "./local-ai";

export interface ATSResult {
  generalScore: number;
  jdMatchScore?: number;
  sections: {
    education: number;
    experience: number;
    skills: number;
    formatting: number;
  };
  extractedSkills?: string[];
  matchedKeywords?: string[];
  missingKeywords: string[];
  bonusKeywords?: string[];
  improvements: string[];
  cgpa?: string;
  experienceYears: number;
  summary?: string;
  hiringSummary?: string;
  qualified?: boolean;
  ipfsCID?: string;
}

/**
 * Analyze resume text fully locally.
 * PDF parsing must be done before calling this (e.g. via pdfjs-dist).
 */
export async function analyzeResume(
  resumeText: string,
  mode: "student" | "employer",
  jobDescription?: string,
  onProgress?: (progress: any) => void
): Promise<ATSResult> {
  const localResult: LocalATSResult = await analyzeResumeLocally(
    resumeText,
    mode === "employer" ? jobDescription : undefined,
    onProgress
  );

  return {
    generalScore: localResult.generalScore,
    jdMatchScore: localResult.jdMatchScore,
    sections: localResult.sections,
    extractedSkills: localResult.extractedSkills,
    matchedKeywords: localResult.matchedKeywords,
    missingKeywords: localResult.missingKeywords,
    improvements: localResult.improvements,
    cgpa: localResult.cgpa,
    experienceYears: 0,   // not extracted locally yet
    summary: mode === "student" ? localResult.summary : undefined,
    hiringSummary: mode === "employer" ? localResult.summary : undefined,
    qualified: localResult.qualified,
    ipfsCID: localResult.ipfsCID,
  };
}
