# ZK Resume Protocol — Architecture

## 1. Overview
ZK Resume Protocol is a decentralized infrastructure for verifiable, privacy-preserving academic credentials and ATS (Applicant Tracking System) scores. It leverages Zero-Knowledge Proofs (Groth16), Ethereum Attestation Service (EAS), and IPFS.

## 2. Key Components

### 2.1 Backend (Smart Contracts)
- **ResumeRegistry.sol**: The central registry.
  - Manages university registration.
  - Verifies ZK proofs of CGPA/Degree.
  - Stores ATS verdicts from employers.
  - Role-based access control (RBAC) via OpenZeppelin.
- **Groth16Verifier.sol**: Auto-generated verifier for the `resume.circom` circuit.

### 2.2 Circuits (Zero-Knowledge)
- **resume.circom**:
  - **Private Inputs**: `cgpa`, `studentId`.
  - **Public Inputs**: `threshold`, `studentIdHash`.
  - **Logic**: Asserts `cgpa >= threshold` and validates `studentIdHash` matches `poseidon(studentId)`.

### 2.3 Frontend (Client-side AI & ZK)
- **Local-first AI**: PDF parsing and ATS scoring via Transformers.js (simulated in local-ai.ts).
- **In-browser ZK**: Generates proofs using `snarkjs` and `circomlibjs`.
- **EAS Integration**: Creates off-chain attestations signed by university keys.

## 3. Data Flow

1. **Attestation**: University signs an off-chain EAS attestation for a student.
2. **Analysis**: Student uploads PDF; local AI scores it.
3. **ZK Binding**: Student generates a ZK proof that their GPA (from EAS) meets a job's threshold without revealing the exact GPA.
4. **Verification**: Employer verifies the proof and signature on-chain via `ResumeRegistry`.
5. **Verdict**: Employer records a hiring verdict on-chain, linked to the student's identity fingerprint.

## 4. Security & Privacy
- **No Private Data On-chain**: GPA and IDs are never stored publicly.
- **Multisig Governance**: Protocol administration is handed over to a Gnosis Safe.
- **RPC Proxying**: Provider keys are hidden via server-side API routes.
