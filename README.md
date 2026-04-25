# ZK Resume Protocol 🎓🔒
**Built by Akhil Muvva**

I got tired of the way academic privacy works. If a job needs to know your GPA, you shouldn't have to hand over a PDF of your entire transcript. That's just lazy tech.

I built the **ZK Resume Protocol** to fix that. It uses ZK-SNARKs and the Ethereum Attestation Service (EAS) so you can prove you meet a requirement (like "GPA > 3.5") without showing the actual grade. The math does the talking, and your privacy stays intact.

I also added a local AI scanner for resumes. It uses Transformers.js to run the NLP model right in your browser. No data ever leaves your machine.

---

### How it Works
This is 100% decentralized. No databases, no centralized APIs.

1.  **The University:** Issues an off-chain attestation via EAS. They sign your ID, degree, and GPA. It’s gasless and lives on IPFS or locally.
2.  **The Student:** You generate a ZK proof (Groth16) in the browser. The circuit checks your GPA against the job's requirements.
    *   *Local AI:* I used MiniLM models to parse resume PDFs locally. The score is hashed using Poseidon and bound to your credential.
3.  **The Employer:** They get your proof and verify it on my `ResumeRegistry` contract on Sepolia. The contract checks the math and confirms everything is legit.

---

### Tech Stack
I kept this lean and focused on privacy:

**Backend & Circuits**
*   **Solidity 0.8.20** for the registry and verifier.
*   **Circom 2.2.3** for the ZK logic (check `resume.circom`).
*   **SnarkJS** for proof generation.
*   **Hardhat** for the dev work and Sepolia deployment.

**Frontend**
*   **Next.js 14** (App Router).
*   **Wagmi & RainbowKit** for wallet connections.
*   **Transformers.js** for the browser-based AI.
*   **Anime.js** for the UI transitions.

---

### Setup
Want to run it?

**1. Backend**
```bash
cd backend
npm install
npm run compile
```

**2. Frontend**
```bash
cd frontend
npm install
npm run dev
```

You'll need a `.env.local` for Pinata and your WalletConnect ID if you're deploying yourself.

---

### Security
*   **Leak-proof:** I used a `GreaterEqThan` constraint. Since CGPA is a private signal, employers can't reverse-engineer your grade from the proof.
*   **Local-First:** I didn't use OpenAI or Anthropic on purpose. Resume data stays in your browser.
*   **Replay Protection:** The contract tracks IDs so nobody can steal or reuse a proof.

*Reach out if you want to talk ZK or Decentralized Identity!*
