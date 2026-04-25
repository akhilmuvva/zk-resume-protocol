# ZK Resume Protocol — API Reference

## 1. Smart Contract (ResumeRegistry.sol)

### `registerUniversity(address university, string name)`
- **Access**: `UNIVERSITY_MANAGER_ROLE` (Multisig).
- **Purpose**: White-lists a university to issue valid EAS attestations.

### `verifyCredential(bytes32 attestationUID, uint256 threshold, bigint studentIdHash, bytes signature, ProofData proof)`
- **Access**: Public.
- **Purpose**: Verifies an EAS attestation and its linked ZK proof in one call.

### `recordATSVerdict(address candidate, bool qualified, uint256 score, string ipfsCID)`
- **Access**: Registered Universities/Employers.
- **Purpose**: Stores the result of an ATS analysis on-chain.

## 2. Frontend Utilities

### `lib/local-ai.ts`
- `extractTextFromPDF(file: File)`: Extracts text via `pdfjs-dist`.
- `analyzeResumeLocally(resumeText, jobDescription)`: Main ATS scoring logic.

### `lib/snarkjs.ts`
- `generateProof(input, onStep)`: Generates a Groth16 proof using `resume.wasm`.

### `lib/eas.ts`
- `createOffchainAttestation(input, signer)`: Generates signed EAS JSON.

## 3. Server Routes

### `app/api/rpc/route.ts`
- **POST**: Proxies JSON-RPC calls to Alchemy/Infura, appending the private `RPC_URL` from environment variables.
- **Security**: Prevents leakage of API keys to browser network logs.
