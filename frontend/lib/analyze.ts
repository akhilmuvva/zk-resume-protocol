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
}

export async function analyzeResume(
  resumeText: string,
  mode: "student" | "employer",
  jobDescription?: string
): Promise<ATSResult> {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ resumeText, mode, jobDescription }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Analysis failed with status ${response.status}`);
  }

  const data = await response.json();
  return data as ATSResult;
}
