"use client";

/**
 * useVerificationEvents
 * ─────────────────────────────────────────────────────────────────
 * Fetches real CredentialVerified event logs from the ResumeRegistry
 * contract using viem's getLogs — no backend, no subgraph, fully
 * client-side on-chain data.
 *
 * Polled every 12 seconds (1 Sepolia block).
 */

import { useEffect, useState, useCallback } from "react";
import { usePublicClient } from "wagmi";
import { REGISTRY_CONTRACT, formatThreshold, shortenAddress } from "./contract";
import { CONTRACTS } from "./wagmi";

export interface VerificationEvent {
  holder:         string;   // full address
  holderShort:    string;   // shortened
  university:     string;   // full address
  universityShort: string;
  threshold:      string;   // formatted e.g. "8.50"
  thresholdRaw:   bigint;
  txHash:         string;
  blockNumber:    bigint;
  age:            string;   // relative time e.g. "3m ago"
}

/** Format a block timestamp (seconds) into a relative "N ago" string */
function timeAgo(timestampSec: number): string {
  const diff = Math.floor(Date.now() / 1000) - timestampSec;
  if (diff < 60)            return `${diff}s ago`;
  if (diff < 3600)          return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)         return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// CredentialVerified event ABI (must match contract)
const CREDENTIAL_VERIFIED_ABI = {
  name: "CredentialVerified",
  type: "event",
  inputs: [
    { name: "holder",         type: "address", indexed: true  },
    { name: "university",     type: "address", indexed: true  },
    { name: "threshold",      type: "uint256", indexed: false },
    { name: "attestationUID", type: "bytes32", indexed: false },
    { name: "blockNumber",    type: "uint256", indexed: false },
  ],
} as const;

export function useVerificationEvents(limit = 20) {
  const client = usePublicClient();

  const [events, setEvents] = useState<VerificationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const isDeployed =
    CONTRACTS.RESUME_REGISTRY !== "0x0000000000000000000000000000000000000000";

  const fetchEvents = useCallback(async () => {
    if (!client || !isDeployed) {
      setLoading(false);
      return;
    }

    try {
      // Fetch raw logs from genesis (or fromBlock if contract was recent)
      const logs = await client.getLogs({
        address: CONTRACTS.RESUME_REGISTRY,
        event:   CREDENTIAL_VERIFIED_ABI,
        fromBlock: "earliest",
        toBlock:   "latest",
      });

      // Newest first, limited
      const sorted = [...logs].reverse().slice(0, limit);

      // Enrich with block timestamps for relative age
      const enriched = await Promise.all(
        sorted.map(async (log) => {
          let age = "—";
          try {
            const block = await client.getBlock({ blockNumber: log.blockNumber });
            age = timeAgo(Number(block.timestamp));
          } catch {
            // timestamp fetch failed — show block number instead
            age = `Block #${log.blockNumber}`;
          }

          const holder     = (log.args?.holder     ?? "0x") as string;
          const university = (log.args?.university  ?? "0x") as string;
          const threshold  = (log.args?.threshold   ?? 0n)  as bigint;

          return {
            holder,
            holderShort:     shortenAddress(holder),
            university,
            universityShort: shortenAddress(university),
            threshold:       formatThreshold(threshold),
            thresholdRaw:    threshold,
            txHash:          log.transactionHash ?? "",
            blockNumber:     log.blockNumber,
            age,
          } satisfies VerificationEvent;
        })
      );

      setEvents(enriched);
      setError(null);
    } catch (err: any) {
      // Contract not deployed yet or RPC error — show empty state
      setError(err?.message?.slice(0, 120) ?? "Could not fetch events");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [client, isDeployed, limit]);

  // Initial fetch + poll every ~12s (one Sepolia block)
  useEffect(() => {
    fetchEvents();
    const id = setInterval(fetchEvents, 12_000);
    return () => clearInterval(id);
  }, [fetchEvents]);

  return { events, loading, error, isDeployed, refetch: fetchEvents };
}
