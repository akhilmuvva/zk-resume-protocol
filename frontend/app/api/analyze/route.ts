import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Simple in-memory rate limit: IP -> { count, timestamp }
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT = 10;
const TIME_WINDOW = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  try {
    // Basic rate limiting
    const ip = (req as any).ip ?? req.headers.get("x-forwarded-for") ?? "unknown";
    const now = Date.now();
    const limitRecord = rateLimitMap.get(ip);
    
    if (limitRecord) {
      if (now - limitRecord.timestamp > TIME_WINDOW) {
        // Reset window
        rateLimitMap.set(ip, { count: 1, timestamp: now });
      } else {
        if (limitRecord.count >= RATE_LIMIT) {
          return NextResponse.json({ error: "Rate limit exceeded. Max 10 requests per hour." }, { status: 429 });
        }
        limitRecord.count += 1;
      }
    } else {
      rateLimitMap.set(ip, { count: 1, timestamp: now });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "Server missing ANTHROPIC_API_KEY." }, { status: 500 });
    }

    const { resumeText, mode, jobDescription } = await req.json();

    if (!resumeText) {
      return NextResponse.json({ error: "Missing resumeText in request body." }, { status: 400 });
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (mode === "student") {
      systemPrompt = `You are an ATS (Applicant Tracking System) expert. Analyze the resume and return ONLY a JSON object with this exact structure:
{
  "generalScore": number,        // 0-100 overall ATS score
  "sections": {
    "education": number,         // 0-100
    "experience": number,        // 0-100
    "skills": number,            // 0-100
    "formatting": number         // 0-100
  },
  "extractedSkills": string[],   // all skills found
  "missingKeywords": string[],   // important missing ATS keywords
  "improvements": string[],      // top 3 actionable suggestions
  "cgpa": string,                // extracted CGPA if found
  "experienceYears": number,     // total years of experience
  "summary": string              // 2-sentence overall assessment
}
Return only the JSON. No markdown. No explanation.`;
      userPrompt = `Resume:\n${resumeText}`;
    } else if (mode === "employer") {
      if (!jobDescription) {
        return NextResponse.json({ error: "Missing jobDescription for employer mode." }, { status: 400 });
      }
      systemPrompt = `You are an ATS expert analyzing resume-to-job-description fit. Return ONLY a JSON object:
{
  "generalScore": number,        // 0-100 overall score
  "jdMatchScore": number,        // 0-100 JD-specific match
  "sections": {
    "education": number,
    "experience": number,
    "skills": number,
    "formatting": number
  },
  "matchedKeywords": string[],   // keywords found in both
  "missingKeywords": string[],   // JD keywords absent in resume
  "bonusKeywords": string[],     // resume has extra relevant skills
  "experienceYears": number,
  "qualified": boolean,          // true if jdMatchScore >= 70
  "improvements": string[],
  "hiringSummary": string        // recruiter-facing 2-sentence verdict
}
Return only the JSON. No markdown. No explanation.`;
      userPrompt = `Resume:\n${resumeText}\n\nJob Description:\n${jobDescription}`;
    } else {
      return NextResponse.json({ error: "Invalid mode." }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const block = message.content.find((block) => block.type === "text");
    const textContent = block && block.type === 'text' ? block.text : null;
    
    if (!textContent) {
      return NextResponse.json({ error: "Empty response from Claude." }, { status: 500 });
    }

    let jsonStr = textContent.trim();
    if (jsonStr.startsWith('\`\`\`json')) {
      jsonStr = jsonStr.substring(7);
      if (jsonStr.endsWith('\`\`\`')) {
        jsonStr = jsonStr.substring(0, jsonStr.length - 3);
      }
    } else if (jsonStr.startsWith('\`\`\`')) {
      jsonStr = jsonStr.substring(3);
      if (jsonStr.endsWith('\`\`\`')) {
        jsonStr = jsonStr.substring(0, jsonStr.length - 3);
      }
    }

    const parsedJson = JSON.parse(jsonStr.trim());
    return NextResponse.json(parsedJson);
  } catch (error: any) {
    console.error("Analyze API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
