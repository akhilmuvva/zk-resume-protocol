# ZK Resume - Frontend
**By Akhil Muvva**

This is the UI for the ZK Resume Protocol. I used Next.js 14 and some browser-heavy tech to keep the whole thing private.

### The Logic
*   **ZK Proving:** Proofs are generated right in the browser with `snarkjs`. The circuits are in `public/circuits/`. I moved the heavy math to a Web Worker so the UI doesn't freeze up while it's crunching numbers.
*   **Local AI:** I used **Transformers.js** and ONNX to run the ATS scoring. It pulls the MiniLM model into the browser and parses your resume PDF locally.
*   **EAS:** Uses the EAS SDK for attestations. These are off-chain signatures to keep things gasless until the final check.

### Running it
```bash
npm install
npm run dev
```

### Performance
ZK proofs are heavy. If the UI lags, check `lib/worker.ts`. I moved the intensive math there to keep things smooth.
