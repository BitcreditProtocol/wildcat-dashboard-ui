const word = (part: string) => (part ? part[0]?.toUpperCase() + part.slice(1) : part);

/** "gpt-5.6-luna" → "GPT-5.6 Luna", "claude-sonnet-5-5" → "Claude Sonnet 5.5"; anything else stays as sent. */
export function modelLabel(id: string): string {
  const bare = id.split("/").pop() ?? id;
  const gpt = /^gpt-([0-9.]+)(?:-([a-z]+))?$/u.exec(bare);
  if (gpt) return [`GPT-${gpt[1] ?? ""}`, gpt[2] ? word(gpt[2]) : ""].filter(Boolean).join(" ");
  const claude = /^claude-([a-z]+)-(\d+)(?:-(\d+))?$/u.exec(bare);
  if (claude) return `Claude ${word(claude[1] ?? "")} ${claude[2] ?? ""}${claude[3] ? `.${claude[3]}` : ""}`;
  return id;
}

const STORAGE_KEY = "ask-the-mint.model";

/** The operator's last choice, if this Mint still offers it; otherwise the Mint's default. */
export function preferredModel(models: { default: string; options: string[] } | undefined): string | undefined {
  if (!models) return undefined;
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    /* Storage can be unavailable (private mode); the default still applies. */
  }
  return stored !== null && models.options.includes(stored) ? stored : models.default;
}

export function rememberModel(id: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* Best effort only. */
  }
}
