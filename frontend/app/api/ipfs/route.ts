/**
 * /api/ipfs — Optional Pinata Pin Route
 * ─────────────────────────────────────────────────────
 * This route is OPTIONAL. The frontend already computes a real
 * content-addressed CIDv1 client-side (see lib/local-ai.ts → computeIPFSCID).
 *
 * If PINATA_JWT is configured, this route will additionally pin the data
 * to Pinata so it's retrievable via the IPFS public gateway.
 * If not configured, the client-side CID is still valid and content-addressed.
 */
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // If no Pinata JWT, return the client-side CID instruction
  if (!process.env.PINATA_JWT) {
    return NextResponse.json(
      {
        error:
          "Pinata not configured. IPFS CID is computed client-side — no pinning needed.",
        hint: "Set PINATA_JWT in .env.local to enable remote pinning.",
      },
      { status: 503 }
    );
  }

  try {
    const { PinataSDK } = await import("pinata");
    const pinata = new PinataSDK({
      pinataJwt: process.env.PINATA_JWT!,
      pinataGateway: process.env.NEXT_PUBLIC_GATEWAY_URL || "gateway.pinata.cloud",
    });

    // Security: limit payload size to prevent DoS (512 KB max)
    const rawBody = await request.text();
    if (rawBody.length > 512_000) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    const data = JSON.parse(rawBody);
    // Pinata SDK v2: upload.public.json(data) → returns { cid, ... }
    const upload = await pinata.upload.public.json(data);

    return NextResponse.json({
      cid: upload.cid,
      url: `https://${process.env.NEXT_PUBLIC_GATEWAY_URL || "gateway.pinata.cloud"}/ipfs/${upload.cid}`,
      pinned: true,
    });
  } catch (error: any) {
    console.error("Pinata Upload Error:", error);
    return NextResponse.json(
      { error: "Upload failed. Please try again later." },
      { status: 500 }
    );
  }
}
