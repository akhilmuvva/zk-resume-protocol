/**
 * DEPRECATED — Server-side PDF parsing removed.
 * PDF text extraction is now performed fully client-side via pdfjs-dist.
 * See: lib/local-ai.ts → extractTextFromPDF()
 */
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "This endpoint has been removed. PDF parsing is now performed client-side using pdfjs-dist. See lib/local-ai.ts → extractTextFromPDF().",
    },
    { status: 410 }
  );
}
