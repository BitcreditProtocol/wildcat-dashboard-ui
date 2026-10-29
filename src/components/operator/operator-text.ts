export interface OperatorRendering {
  status: "translated" | "same_language" | "pending" | "failed";
  text?: string;
  sourceLanguage?: string;
  promptVersion?: string;
  model?: string;
  createdAt?: string;
}
export type OperatorTextMap = Map<string, Record<string, OperatorRendering>>;
const object = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
/** The only wire adapter for FR-H2's additive display-only operator-text-v1 contract. */
export function operatorTextFromResponse(value: unknown): OperatorTextMap {
  const result: OperatorTextMap = new Map();
  if (!object(value) || !object(value.operatorText)) return result;
  const text = value.operatorText;
  if (text.schemaVersion !== "operator-text-v1" || !Array.isArray(text.records)) return result;
  for (const record of text.records) {
    if (!object(record) || typeof record.original !== "string" || !object(record.operatorRenderings)) continue;
    const languages: Record<string, OperatorRendering> = {};
    for (const [lang, rendering] of Object.entries(record.operatorRenderings)) {
      if (!object(rendering)) continue;
      const { status, text, sourceLanguage, promptVersion, model, createdAt } = rendering;
      if (status === "pending" || status === "failed" || status === "same_language") languages[lang] = { status };
      else if (
        status === "translated" &&
        typeof text === "string" &&
        typeof sourceLanguage === "string" &&
        typeof promptVersion === "string" &&
        typeof model === "string" &&
        typeof createdAt === "string"
      )
        languages[lang] = { status, text, sourceLanguage, promptVersion, model, createdAt };
    }
    result.set(record.original, languages);
  }
  return result;
}

export function withoutOperatorText(value: unknown): unknown {
  if (!object(value) || !("operatorText" in value)) return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "operatorText"));
}
