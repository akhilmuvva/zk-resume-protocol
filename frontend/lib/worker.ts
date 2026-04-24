import { pipeline, env, type FeatureExtractionPipeline } from "@huggingface/transformers";

// Configuration for local Transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

let extractor: FeatureExtractionPipeline | null = null;

/**
 * Compute cosine similarity between two vectors.
 */
function cosineSimilarity(v1: number[], v2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    for (let i = 0; i < v1.length; i++) {
        dotProduct += v1[i] * v2[i];
        norm1 += v1[i] * v1[i];
        norm2 += v2[i] * v2[i];
    }
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

// Handle messages from the main thread
self.onmessage = async (event: MessageEvent) => {
    const { type, payload } = event.data;

    try {
        if (type === "load") {
            if (!extractor) {
                self.postMessage({ type: "status", payload: "Loading AI model..." });
                extractor = await (pipeline as any)("feature-extraction", "onnx-community/all-MiniLM-L6-v2", {
                    progress_callback: (progress: any) => {
                        self.postMessage({ type: "progress", payload: progress });
                    },
                });
                self.postMessage({ type: "ready" });
            } else {
                self.postMessage({ type: "ready" });
            }
        } else if (type === "analyze") {
            const { resumeText, jobDescription } = payload;

            if (!extractor) {
                throw new Error("Model not loaded");
            }

            self.postMessage({ type: "status", payload: "Computing semantic embeddings..." });

            // Compute embedding for resume
            const resumeOutput = await extractor(resumeText, { pooling: "mean", normalize: true });
            const resumeVector = Array.from(resumeOutput.data as Float32Array);

            let jdMatchScore = 0;
            if (jobDescription) {
                // Compute embedding for job description
                const jdOutput = await extractor(jobDescription, { pooling: "mean", normalize: true });
                const jdVector = Array.from(jdOutput.data as Float32Array);

                // Compute similarity
                const similarity = cosineSimilarity(resumeVector, jdVector);
                jdMatchScore = Math.max(0, Math.min(100, Math.round(similarity * 100)));
            }

            self.postMessage({ 
                type: "result", 
                payload: { 
                    jdMatchScore,
                    timestamp: Date.now()
                } 
            });
        }
    } catch (error: any) {
        self.postMessage({ type: "error", payload: error.message });
    }
};
