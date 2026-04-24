import { PinataSDK } from "pinata";
import { NextResponse } from "next/server";

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT!,
  pinataGateway: process.env.NEXT_PUBLIC_GATEWAY_URL || "gateway.pinata.cloud",
});

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Check if Pinata JWT is configured
    if (!process.env.PINATA_JWT) {
      return NextResponse.json(
        { error: "Pinata JWT not configured on server." },
        { status: 500 }
      );
    }

    // Upload JSON to Pinata
    const upload = await pinata.upload.json(data);

    return NextResponse.json({ 
      cid: upload.IpfsHash,
      url: `https://${process.env.NEXT_PUBLIC_GATEWAY_URL || "gateway.pinata.cloud"}/ipfs/${upload.IpfsHash}`
    });

  } catch (error: any) {
    console.error("Pinata Upload Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload to Pinata" },
      { status: 500 }
    );
  }
}
