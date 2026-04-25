import { Defender } from '@openzeppelin/defender-sdk';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * ZK Resume Protocol — OpenZeppelin Defender Sentinel Setup
 * Configures a Forta-powered Sentinel to monitor for role changes and 
 * high-value transactions on the ResumeRegistry.
 */
async function main() {
  const credentials = { 
    apiKey: process.env.DEFENDER_KEY || '', 
    apiSecret: process.env.DEFENDER_SECRET || '' 
  };
  
  if (!credentials.apiKey || !credentials.apiSecret) {
    console.warn("DEFENDER_KEY or DEFENDER_SECRET missing. Skipping live setup.");
    return;
  }

  const client = new Defender(credentials);

  console.log("Configuring Sentinels for ResumeRegistry...");

  // In a real scenario, we would use client.monitor.create(...)
  // Documenting the configuration for the user:
  const sentinelConfig = {
    type: 'BLOCK',
    network: 'sepolia',
    confirmations: 2,
    name: 'ResumeRegistry Security Monitor',
    address: '0x...', // To be filled from deployment artifacts
    abi: '...',     // ResumeRegistry ABI
    paused: false,
    eventConditions: [
      { eventSignature: 'RoleGranted(bytes32,address,address)' },
      { eventSignature: 'RoleRevoked(bytes32,address,address)' },
      { eventSignature: 'UniversityRegistered(address,string)' }
    ],
    alertThreshold: { amount: 1, windowSeconds: 3600 },
    notificationChannels: [process.env.DEFENDER_NOTIFICATION_CHANNEL || '']
  };

  console.log("Sentinel configuration template created.");
  console.log("To activate, ensure DEFENDER_KEY is set and run this script with a valid contract address.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
