import { createLogger } from "@/lib/logger";

const logger = createLogger("local-storage");

export function setItem(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    logger.error("Failed to set item", { key, err });
  }
}

export function getItem<T>(key: string): T | undefined {
  try {
    const data = window.localStorage.getItem(key);
    return data ? (JSON.parse(data) as T) : undefined;
  } catch (err) {
    logger.error("Failed to get item", { key, err });
  }
}

export function removeItem(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch (err) {
    logger.error("Failed to remove item", { key, err });
  }
}
