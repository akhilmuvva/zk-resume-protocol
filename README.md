# ZK Resume Protocol 🎓🔒

**Prove Your Credentials. Reveal Nothing.**

ZK Resume Protocol is a decentralized, privacy-preserving academic credential verification system. It leverages **Zero-Knowledge Proofs (ZK-SNARKs)** and the **Ethereum Attestation Service (EAS)** to allow students to prove they meet a specific GPA/Degree threshold for a job without ever revealing their actual grades. 

Additionally, it features an **AI-powered Applicant Tracking System (ATS) Scorer** built with Claude 3.5 Sonnet, which generates cryptographic hashes of the resume score to bind it to the decentralized credential.

---

## 🏗️ Architecture & Flow

The system operates with a fully decentralized architecture—no backend APIs, no databases, and no trusted intermediaries.

1. **🏛️ University (Issuer):** 
   - Signs student credential data (Student ID hash, Degree, CGPA, Year) using the EAS SDK. 
   - This creates a **gasless off-chain attestation**.
2. **🧑‍🎓 Student (Holder):**
   - Receives the EAS attestation.
   - Computes a ZK-SNARK (Groth16) entirely inside their browser using `snarkjs` and WebAssembly.
   - The circuit verifies that the student's *actual CGPA* is `>=` the *employer's required threshold*.
   - Only the proof and the public threshold are exported. The raw CGPA never leaves the device.
   - *AI ATS Analysis:* Students can upload their PDF resume to get an AI-generated ATS score, which is hashed via Poseidon and ready to be bound to their ZK credential.
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
- **Claude API (Anthropic):** AI-powered ATS resume parsing and scoring.

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
ANTHROPIC_API_KEY=your_claude_api_key
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
- **Serverless AI Parsing:** The PDF text extraction and Claude ATS scoring happen securely via Next.js serverless route handlers, ensuring your API key is never exposed to the client.

---
*Built with ❤️ for Web3 Privacy & Verifiable Credentials.*
