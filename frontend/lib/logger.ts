/**
 * ZK Resume Protocol — Production Guarded Logger
 */
const isProd = process.env.NODE_ENV === "production";

export const logger = {
  log: (...args: any[]) => {
    if (!isProd) {
      console.log("[ZK-LOG]:", ...args);
    }
  },
  warn: (...args: any[]) => {
    if (!isProd) {
      console.warn("[ZK-WARN]:", ...args);
    }
  },
  error: (...args: any[]) => {
    // Errors should always be logged in prod for monitoring
    console.error("[ZK-ERROR]:", ...args);
  },
  info: (...args: any[]) => {
    if (!isProd) {
      console.info("[ZK-INFO]:", ...args);
    }
  }
};
