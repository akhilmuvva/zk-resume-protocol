/**
 * Contract Library — ResumeRegistry Interactions
 * ─────────────────────────────────────────────────────
 * All on-chain reads and writes for the ResumeRegistry contract.
 * Uses wagmi hooks — no backend needed.
 */

import { CONTRACTS } from "./wagmi";
import type { GeneratedProof } from "./snarkjs";

// ── ABI — only the functions we call from the frontend ─────────────
export const RESUME_REGISTRY_ABI = [
  // Write
  {
    name: "verifyCredential",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_pA",           type: "uint256[2]"    },
      { name: "_pB",           type: "uint256[2][2]" },
      { name: "_pC",           type: "uint256[2]"    },
      { name: "_pubSignals",   type: "uint256[2]"    },
      { name: "_attestationUID", type: "bytes32"     },
      { name: "_easSignature", type: "bytes"         },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "registerUniversity",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "universityAddress", type: "address" },
      { name: "name",              type: "string"  },
    ],
    outputs: [],
  },
  {
    name: "recordATSVerdict",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "candidate", type: "address" },
      { name: "qualified", type: "bool"    },
      { name: "score",     type: "uint256" },
      { name: "ipfsCID",   type: "string"  },
    ],
    outputs: [],
  },

  // Read
  {
    name: "checkQualification",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "holder",       type: "address"  },
      { name: "minThreshold", type: "uint256"  },
    ],
    outputs: [
      { name: "qualified", type: "bool"    },
      {
        name: "record",
        type: "tuple",
        components: [
          { name: "isVerified",        type: "bool"    },
          { name: "threshold",         type: "uint256" },
          { name: "verifiedAt",        type: "uint256" },
          { name: "attestationUID",    type: "bytes32" },
          { name: "universityAddress", type: "address" },
          { name: "blockNumber",       type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "verifications",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "holder", type: "address" }],
    outputs: [
      { name: "isVerified",        type: "bool"    },
      { name: "threshold",         type: "uint256" },
      { name: "verifiedAt",        type: "uint256" },
      { name: "attestationUID",    type: "bytes32" },
      { name: "universityAddress", type: "address" },
      { name: "blockNumber",       type: "uint256" },
    ],
  },
  {
    name: "registeredUniversities",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ type: "string" }],
  },
  {
    name: "totalVerifications",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "getAllVerifiedHolders",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address[]" }],
  },

  // Events
  {
    name: "CredentialVerified",
    type: "event",
    inputs: [
      { name: "holder",       type: "address", indexed: true  },
      { name: "university",   type: "address", indexed: true  },
      { name: "threshold",    type: "uint256", indexed: false },
      { name: "attestationUID", type: "bytes32", indexed: false },
      { name: "blockNumber",  type: "uint256", indexed: false },
    ],
  },
] as const;

// ── Wagmi contract config ───────────────────────────────────────────
export const REGISTRY_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
export const REGISTRY_CONTRACT = {
  address: REGISTRY_ADDRESS,
  abi: RESUME_REGISTRY_ABI,
} as const;

// ── Helper Types ───────────────────────────────────────────────────
export interface VerificationRecord {
  isVerified: boolean;
  threshold: bigint;
  verifiedAt: bigint;
  attestationUID: `0x${string}`;
  universityAddress: `0x${string}`;
  blockNumber: bigint;
}

/**
 * Format proof calldata for contract write args.
 * Converts bigint arrays to the exact format wagmi expects.
 */
export function formatVerifyArgs(
  proof: GeneratedProof,
  attestationUID: `0x${string}`,
  easSignature: `0x${string}`
): readonly [
  readonly [bigint, bigint],
  readonly [readonly [bigint, bigint], readonly [bigint, bigint]],
  readonly [bigint, bigint],
  readonly [bigint, bigint],
  `0x${string}`,
  `0x${string}`
] {
  return [
    proof.calldata.pA,
    proof.calldata.pB,
    proof.calldata.pC,
    proof.calldata.pubSignals,
    attestationUID,
    easSignature,
  ] as const;
}

/**
 * Format a threshold value for display.
 * Contract stores CGPA × 100, display as decimal.
 */
export function formatThreshold(threshold: bigint): string {
  const n = Number(threshold);
  return (n / 100).toFixed(2);
}

/**
 * Shorten an Ethereum address for display.
 */
export function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/**
 * Get Etherscan link for a transaction hash.
 */
export function etherscanTx(txHash: string): string {
  return `https://sepolia.etherscan.io/tx/${txHash}`;
}

/**
 * Get Etherscan link for a contract address.
 */
export function etherscanAddr(addr: string): string {
  return `https://sepolia.etherscan.io/address/${addr}`;
}
