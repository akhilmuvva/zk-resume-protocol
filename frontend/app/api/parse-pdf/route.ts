import { NextRequest, NextResponse } from "next/server";
// @ts-ignore
import pdfParse from "pdf-parse";

export async function POST(req: NextRequest) {
  try {
    const formData = (await req.formData()) as any;
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const data = await pdfParse(buffer);
    
    return NextResponse.json({ text: data.text });
  } catch (error: any) {
    console.error("PDF Parse error:", error);
    return NextResponse.json({ error: error.message || "Failed to parse PDF" }, { status: 500 });
  }
}
