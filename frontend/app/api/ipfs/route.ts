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

    const data = await request.json();
    const upload = await pinata.upload.json(data);

    return NextResponse.json({
      cid: upload.IpfsHash,
      url: `https://${process.env.NEXT_PUBLIC_GATEWAY_URL || "gateway.pinata.cloud"}/ipfs/${upload.IpfsHash}`,
      pinned: true,
    });
  } catch (error: any) {
    console.error("Pinata Upload Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload to Pinata" },
      { status: 500 }
    );
  }
}
