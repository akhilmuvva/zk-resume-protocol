# ZK Resume Protocol 🎓🔒

**Prove Your Credentials. Reveal Nothing.**

ZK Resume Protocol is a decentralized, privacy-preserving academic credential verification system. It leverages **Zero-Knowledge Proofs (ZK-SNARKs)** and the **Ethereum Attestation Service (EAS)** to allow students to prove they meet a specific GPA/Degree threshold for a job without ever revealing their actual grades. 

Additionally, it features a **fully decentralized AI-powered Applicant Tracking System (ATS) Scorer** built with **Transformers.js (v3)**, which runs entirely in the student's browser. It generates cryptographic hashes of the resume score to bind it to the decentralized credential via the **Ethereum Attestation Service (EAS)**.

---

## 🏗️ Architecture & Flow

The system operates with a **purely decentralized architecture**—no backend APIs, no centralized LLMs, no databases, and no trusted intermediaries.

1. **🏛️ University (Issuer):** 
   - Signs student credential data (Student ID hash, Degree, CGPA, Year) using the EAS SDK. 
   - This creates a **gasless off-chain attestation**.
2. **🧑‍🎓 Student (Holder):**
   - Receives the EAS attestation.
   - Computes a ZK-SNARK (Groth16) entirely inside their browser using `snarkjs` and WebAssembly.
   - The circuit verifies that the student's *actual CGPA* is `>=` the *employer's required threshold*.
   - Only the proof and the public threshold are exported. The raw CGPA never leaves the device.
    - *Local AI Analysis:* Students upload their PDF resume to get an AI-generated ATS score using a local **ONNX model (all-MiniLM-L6-v2)**. The score is hashed via Poseidon and ready to be bound to their ZK credential.
3. **🏢 Employer (Verifier):**
   - Receives the cryptographic proof from the student.
   - Calls the `verifyCredential` function on the `ResumeRegistry` smart contract deployed on the Sepolia Testnet.
   - The smart contract mathematically verifies the proof on-chain and logs a successful verification event.

---

## 🛠️ Technology Stack

### Smart Contracts (`/backend`)
- **Solidity ^0.8.20:** Smart contracts for the verifier and registry.
- **Circom 2.2.3:** Zero-knowledge circuit development (`resume.circom`).
- **SnarkJS / circomlibjs:** ZK proof generation, trusted setup, and Poseidon hashing.
- **Hardhat:** Deployment, testing, and compilation.
- **Network:** Ethereum Sepolia Testnet.

### Frontend (`/frontend`)
- **Next.js 14 (App Router):** Core framework.
- **TypeScript & Tailwind CSS:** Styling and type safety (with a custom Web3 glassmorphism aesthetic).
- **Wagmi v2 & RainbowKit:** Wallet connection and contract interaction.
- **EAS SDK:** Off-chain attestations.
- **Anime.js:** Fluid micro-animations for the UI components.
- **Transformers.js (v3):** Local, client-side NLP using ONNX Runtime for semantic similarity and ATS scoring.
- **Pinata (IPFS):** Decentralized metadata storage for ATS verdicts.

---

## 📂 Project Structure

\`\`\`text
zk-resume-protocol/
├── backend/                  # Smart contracts and ZK circuits
│   ├── circuits/             # Circom circuits and Groth16 artifacts
│   ├── contracts/            # Solidity smart contracts
│   ├── scripts/              # Deployment and Ceremony scripts
│   └── test/                 # Hardhat tests
│
├── frontend/                 # Next.js 14 web application
│   ├── app/                  # App Router pages (Analyze, Issue, Verify, etc.)
│   ├── components/           # Reusable UI components & Animations
│   ├── lib/                  # Wagmi config, snarkjs wrappers, EAS helpers
│   └── public/circuits/      # WASM and ZKey files for browser-proving
│
└── README.md                 # Project documentation
\`\`\`

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js (v18+)
- MetaMask (or another Web3 wallet) configured for Sepolia Testnet.

### 1. Backend Setup
Navigate to the backend directory and install dependencies:
\`\`\`bash
cd backend
npm install
\`\`\`

Compile circuits, run the Groth16 trusted setup, and compile the smart contracts:
\`\`\`bash
npm run compile
npx hardhat test
\`\`\`

*(Note: Environment variables for deployment are handled in `backend/.env`)*

### 2. Frontend Setup
Navigate to the frontend directory:
\`\`\`bash
cd frontend
npm install
\`\`\`

Create a `.env.local` file and add your Anthropic API Key for the ATS feature:
\`\`\`env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_id
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_id
PINATA_JWT=your_pinata_jwt_for_metadata_storage
NEXT_PUBLIC_GATEWAY_URL=your_pinata_gateway
\`\`\`

Start the development server:
\`\`\`bash
npm run dev
\`\`\`
The app will be running at `http://localhost:3000`.

---

## 🔐 Security & Privacy

- **No Data Leaks:** The ZK circuit uses a `GreaterEqThan` constraint. The raw CGPA is passed as a *private signal* and is fundamentally impossible to extract from the generated proof.
- **Replay Protection:** The `ResumeRegistry.sol` contract hashes the proof's public parameters to ensure a student cannot reuse the same exact proof submission twice.
- **Client-side AI Parsing:** PDF text extraction and AI scoring happen **entirely in the browser** via Web Workers and Transformers.js. No resume data ever leaves your device, ensuring maximum privacy and eliminating centralized API dependency.

---
*Built with ❤️ for Web3 Privacy & Verifiable Credentials.*
