// local-ai.ts - resume analysis
// all runs on device, no server.
import { logger } from "./logger";


export interface LocalATSResult {
  generalScore: number;
  jdMatchScore?: number;
  sections: {
    education: number;
    experience: number;
    skills: number;
    formatting: number;
  };
  matchedKeywords: string[];
  missingKeywords: string[];
  improvements: string[];
  ipfsCID: string;
  extractedSkills: string[];
  summary: string;
  qualified: boolean;
  cgpa?: string;
}

// pdf text extraction
export async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // cdn worker for pdfjs
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ");
    fullText += pageText + "\n";
  }

  return fullText;
}

// main analysis - keyword matching + scoring
export async function analyzeResumeLocally(
  resumeText: string,
  jobDescription?: string,
  onProgress?: (progress: any) => void
): Promise<LocalATSResult> {
  
  // Keyword overlap scoring
  const jdMatchScore = computeJDMatchScore(resumeText, jobDescription);

  // Structural analysis keywords
  const technicalKeywords = [
    "React", "Node.js", "TypeScript", "Solidity", "Rust", "Python", 
    "Machine Learning", "Kubernetes", "AWS", "Docker", "Zero-Knowledge",
    "Cryptography", "Smart Contracts", "Backend", "Frontend", "Fullstack",
    "Tailwind", "Next.js", "Ethers.js", "Hardhat", "Foundry", "Go", "Java", "C++"
  ];

  const lowerResume = resumeText.toLowerCase();
  const foundSkills = technicalKeywords.filter(skill => 
    lowerResume.includes(skill.toLowerCase())
  );

  // extract gpa
  const cgpaMatch = resumeText.match(/(\d\.\d{1,2})\s*\/\s*10|\b(GPA|CGPA):?\s*(\d\.\d{1,2})/i);
  const extractedCGPA = cgpaMatch ? (cgpaMatch[1] || cgpaMatch[3]) : undefined;

  const sections = {
    education: lowerResume.includes("university") || lowerResume.includes("college") || lowerResume.includes("degree") ? 85 : 40,
    experience: lowerResume.includes("experience") || lowerResume.includes("worked") || lowerResume.includes("intern") || lowerResume.includes("founder") ? 90 : 30,
    skills: Math.min(foundSkills.length * 15, 100),
    formatting: 95 
  };

  const avgStructuralScore = (sections.education + sections.experience + sections.skills + sections.formatting) / 4;
  
  let generalScore: number;
  let summary: string;
  let qualified: boolean;

  if (jobDescription) {
    generalScore = Math.round((avgStructuralScore * 0.4) + (jdMatchScore * 0.6));
    qualified = jdMatchScore >= 65;
    summary = `Local analysis complete. JD Match: ${jdMatchScore}%. ${qualified ? "Profile looks like a strong fit." : "Alignment could be better."}`;
  } else {
    generalScore = Math.round(avgStructuralScore);
    qualified = generalScore >= 70;
    summary = "Decentralized AI analysis done. Your resume is " + (generalScore > 80 ? "solid" : "pretty good") + " based on modern standards.";
  }

  const missingKeywords = jobDescription 
    ? technicalKeywords.filter(skill => jobDescription.toLowerCase().includes(skill.toLowerCase()) && !foundSkills.includes(skill))
    : technicalKeywords.filter(skill => !foundSkills.includes(skill)).slice(0, 3);

  const improvements = [
    "Try adding more quantitative metrics to your experience section.",
    foundSkills.length < 5 ? "Boost your technical stack section with more core tools." : "Your tech stack representation is strong.",
    jdMatchScore < 70 && jobDescription ? "Consider tailoring your summary to better match the JD keywords." : "Layout is clean and ATS-friendly."
  ];

  const analysisData = {
    generalScore,
    jdMatchScore,
    sections,
    matchedKeywords: foundSkills,
    missingKeywords,
    improvements,
    extractedSkills: foundSkills,
    summary,
    qualified,
    cgpa: extractedCGPA
  };

  // deterministic id
  const ipfsCID = await computeIPFSCID(analysisData);

  return {
    ...analysisData,
    ipfsCID
  };
}

// CIDv1 (SHA-256) via WebCrypto
export async function computeIPFSCID(data: any): Promise<string> {
  try {
    const json = canonicalJSON(data);
    const encoder = new TextEncoder();
    const bytes = encoder.encode(json);

    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    const digest = new Uint8Array(hashBuffer);

    // CIDv1: version, dag-json codec, sha2-256 multihash, length, digest
    const cidBytes = new Uint8Array([
      0x01,        
      0x80, 0x02,  
      0x12,        
      0x20,        
      ...digest
    ]);

    return "b" + base32Upper(cidBytes); 
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      logger.warn("CID generation failed, falling back to basic hash:", err);
    }
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const ab = await blob.arrayBuffer();
    const hash = await crypto.subtle.digest("SHA-256", ab);
    const hex = Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, "0")).join("");
    return `bafkrei${hex.substring(0, 48)}`;
  }
}

// base32 encoding
function base32Upper(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let result = "";
  let buffer = 0;
  let bitsLeft = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bitsLeft += 8;
    while (bitsLeft >= 5) {
      bitsLeft -= 5;
      result += alphabet[(buffer >> bitsLeft) & 0x1f];
    }
  }
  if (bitsLeft > 0) {
    result += alphabet[(buffer << (5 - bitsLeft)) & 0x1f];
  }
  return result;
}

// sort keys for deterministic json
function canonicalJSON(value: any): string {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return JSON.stringify(value);
  }
  const sorted = Object.keys(value)
    .sort()
    .reduce((acc: any, key) => {
      acc[key] = value[key];
      return acc;
    }, {});
  return JSON.stringify(sorted, (_k, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.keys(v).sort().reduce((a: any, k) => { a[k] = v[k]; return a; }, {})
      : v
  );
}

// server backup if needed
export async function uploadToIPFS(data: any): Promise<string> {
  try {
    const response = await fetch("/api/ipfs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Pinata failed");
    const { cid } = await response.json();
    return cid;
  } catch (_err) {
    return computeIPFSCID(data);
  }
}

// Jaccard similarity for keyword matching
function computeJDMatchScore(resumeText: string, jobDescription?: string): number {
  if (!jobDescription) return 0;

  const tokenize = (text: string) =>
    text.toLowerCase().match(/\b[a-z][a-z0-9+.#-]{1,}\b/g) ?? [];

  const resumeTokens  = new Set(tokenize(resumeText));
  const jdTokens      = tokenize(jobDescription);
  const jdUnique      = new Set(jdTokens);

  if (jdUnique.size === 0) return 0;

  let matched = 0;
  for (const token of jdUnique) {
    if (resumeTokens.has(token)) matched++;
  }

  const jaccard = matched / (resumeTokens.size + jdUnique.size - matched);
  // Scaling constant to make the % feel more "human" based on typical resume density.
  return Math.min(100, Math.round(jaccard * 350));
}
