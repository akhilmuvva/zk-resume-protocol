export interface WorkerMessage {
  type: "load" | "analyze" | "status" | "progress" | "ready" | "result" | "error";
  payload?: any;
}

class AIService {
  private worker: Worker | null = null;
  private isLoaded = false;
  private loadPromise: Promise<void> | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.initWorker();
    }
  }

  private initWorker() {
    this.worker = new Worker(new URL("./worker.ts", import.meta.url));
  }

  async loadModel(onProgress?: (progress: any) => void): Promise<void> {
    if (this.isLoaded) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = new Promise((resolve, reject) => {
      if (!this.worker) {
        return reject(new Error("Worker not initialized"));
      }

      const handler = (event: MessageEvent<WorkerMessage>) => {
        const { type, payload } = event.data;

        if (type === "progress" && onProgress) {
          onProgress(payload);
        } else if (type === "ready") {
          this.isLoaded = true;
          this.worker?.removeEventListener("message", handler);
          resolve();
        } else if (type === "error") {
          reject(new Error(payload));
        }
      };

      this.worker.addEventListener("message", handler);
      this.worker.postMessage({ type: "load" });
    });

    return this.loadPromise;
  }

  async analyze(resumeText: string, jobDescription?: string): Promise<{ jdMatchScore: number }> {
    await this.loadModel();

    return new Promise((resolve, reject) => {
      if (!this.worker) return reject(new Error("Worker not initialized"));

      const handler = (event: MessageEvent<WorkerMessage>) => {
        const { type, payload } = event.data;

        if (type === "result") {
          this.worker?.removeEventListener("message", handler);
          resolve(payload);
        } else if (type === "error") {
          this.worker?.removeEventListener("message", handler);
          reject(new Error(payload));
        }
      };

      this.worker.addEventListener("message", handler);
      this.worker.postMessage({
        type: "analyze",
        payload: { resumeText, jobDescription },
      });
    });
  }
}

export const aiService = new AIService();
