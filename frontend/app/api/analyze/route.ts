/**
 * DEPRECATED — Claude API route removed.
 * Resume analysis is now performed fully client-side via Transformers.js.
 * See: lib/local-ai.ts → analyzeResumeLocally()
 */
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "This endpoint has been removed. Analysis is now performed client-side using Transformers.js (fully decentralized). Use lib/local-ai.ts → analyzeResumeLocally().",
    },
    { status: 410 } // 410 Gone
  );
}
