import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia, hardhat } from "wagmi/chains";
import { http } from "viem";

export const wagmiConfig = getDefaultConfig({
  appName: "ZK Resume Protocol",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "zk-resume-demo",
  chains: [sepolia, hardhat],
  transports: {
    [sepolia.id]: http("/api/rpc"),
    [hardhat.id]: http(),
  },
  ssr: true,
});

// Contract addresses — populated after deployment
export const CONTRACTS = {
  RESUME_REGISTRY: (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
  RESUME_VERIFIER: (process.env.NEXT_PUBLIC_VERIFIER_ADDRESS ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
  EAS_SEPOLIA: "0xC2679fBD37d54388Ce493F1DB75320D236e1815e" as `0x${string}`,
};

export const SCHEMA_UID = process.env.NEXT_PUBLIC_SCHEMA_UID || "";
export const SEPOLIA_CHAIN_ID = 11155111;
