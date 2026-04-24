import { aiService } from "./ai-service";

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

/**
 * Extracts text from a PDF file on the client side.
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // @ts-ignore
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

/**
 * Perform local NLP analysis on resume text.
 * Returns scores and simulates IPFS CID generation.
 */
export async function analyzeResumeLocally(
  resumeText: string,
  jobDescription?: string,
  onProgress?: (progress: any) => void
): Promise<LocalATSResult> {
  
  // 1. Semantic Analysis via Web Worker (Transformers.js)
  const { jdMatchScore } = await aiService.analyze(resumeText, jobDescription);

  // 2. Rule-based Analysis for structural scoring
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

  // Extract CGPA (Simple Regex)
  const cgpaMatch = resumeText.match(/(\d\.\d{1,2})\s*\/\s*10|\b(GPA|CGPA):?\s*(\d\.\d{1,2})/i);
  const extractedCGPA = cgpaMatch ? (cgpaMatch[1] || cgpaMatch[3]) : undefined;

  // 3. Scoring Logic
  // Base structural score
  const sections = {
    education: lowerResume.includes("university") || lowerResume.includes("college") || lowerResume.includes("degree") ? 85 : 40,
    experience: lowerResume.includes("experience") || lowerResume.includes("worked") || lowerResume.includes("intern") || lowerResume.includes("founder") ? 90 : 30,
    skills: Math.min(foundSkills.length * 15, 100),
    formatting: 95 // PDF structure was readable
  };

  const avgStructuralScore = (sections.education + sections.experience + sections.skills + sections.formatting) / 4;
  
  let generalScore: number;
  let summary: string;
  let qualified: boolean;

  if (jobDescription) {
    // If JD is provided, JD match score has higher weight
    generalScore = Math.round((avgStructuralScore * 0.4) + (jdMatchScore * 0.6));
    qualified = jdMatchScore >= 65;
    summary = `Candidate analysis performed locally. Semantic match score with job description: ${jdMatchScore}%. ${qualified ? "Profile shows strong alignment." : "Alignment could be improved."}`;
  } else {
    // Student mode: General "ATS readability" score
    generalScore = Math.round(avgStructuralScore);
    qualified = generalScore >= 70;
    summary = "Decentralized AI Analysis complete. Your resume shows " + (generalScore > 80 ? "excellent" : "good") + " alignment with modern technical standards.";
  }

  const missingKeywords = jobDescription 
    ? technicalKeywords.filter(skill => jobDescription.toLowerCase().includes(skill.toLowerCase()) && !foundSkills.includes(skill))
    : technicalKeywords.filter(skill => !foundSkills.includes(skill)).slice(0, 3);

  const improvements = [
    "Incorporate more quantitative metrics in your experience section.",
    foundSkills.length < 5 ? "Add more core industry-standard technologies to your skills section." : "Your technical stack is well-represented.",
    jdMatchScore < 70 && jobDescription ? "Tailor your professional summary to highlight keywords from the job description." : "Ensure your layout remains ATS-friendly."
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

  // 4. IPFS Storage
  const ipfsCID = await uploadToIPFS(analysisData);

  return {
    ...analysisData,
    ipfsCID
  };
}

/**
 * Uploads analysis results to Pinata via the server-side API route.
 */
export async function uploadToIPFS(data: any): Promise<string> {
  try {
    const response = await fetch("/api/ipfs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to upload metadata to IPFS via Pinata.");
    }

    const { cid } = await response.json();
    return cid;
  } catch (error) {
    console.error("IPFS Upload Error:", error);
    // Fallback to simulated CID
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const arrayBuffer = await blob.arrayBuffer();
    const hash = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `simulated_bafybei${hashHex.substring(0, 30)}`;
  }
}

