type LogLevel = "debug" | "info" | "warn" | "error";

const isDevelopment = import.meta.env.DEV;

const writeLog = (level: LogLevel, scope: string, message: string, details: unknown[]) => {
  if ((level === "debug" || level === "info") && !isDevelopment) {
    return;
  }

  const entry = [`[${scope}] ${message}`, ...details];

  switch (level) {
    case "debug":
      console.debug(...entry);
      break;
    case "info":
      console.info(...entry);
      break;
    case "warn":
      console.warn(...entry);
      break;
    case "error":
      console.error(...entry);
      break;
  }
};

export function createLogger(scope: string) {
  return {
    debug: (message: string, ...details: unknown[]) => writeLog("debug", scope, message, details),
    error: (message: string, ...details: unknown[]) => writeLog("error", scope, message, details),
    info: (message: string, ...details: unknown[]) => writeLog("info", scope, message, details),
    warn: (message: string, ...details: unknown[]) => writeLog("warn", scope, message, details),
  };
}
