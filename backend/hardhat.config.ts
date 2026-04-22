import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-gas-reporter";
import * as dotenv from "dotenv";

dotenv.config();

const SEPOLIA_URL = process.env.SEPOLIA_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x" + "0".repeat(64);
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },

  networks: {
    // ── Local dev ──────────────────────────────────
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },

    // ── Sepolia Testnet ────────────────────────────
    sepolia: {
      url: SEPOLIA_URL,
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
      gasPrice: "auto",
    },
  },

  // ── Etherscan Verification ─────────────────────
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY,
    },
  },

  // ── Gas Reporting ──────────────────────────────
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    token: "ETH",
    outputFile: "gas-report.txt",
    noColors: true,
  },

  // ── Paths ──────────────────────────────────────
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  // ── TypeChain ──────────────────────────────────
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;
