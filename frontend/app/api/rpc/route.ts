import { NextResponse } from "next/server";

/**
 * ZK Resume Protocol — RPC Proxy
 * Hides Alchemy/Infura keys from the client-side network tab.
 */
export async function POST(request: Request) {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  
  if (!rpcUrl) {
    return NextResponse.json(
      { error: "SEPOLIA_RPC_URL not configured in environment" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("RPC Proxy Error:", err);
    return NextResponse.json(
      { error: "Failed to proxy RPC request" },
      { status: 502 }
    );
  }
}
