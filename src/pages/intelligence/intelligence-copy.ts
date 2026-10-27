import type { MintIntelligenceNote } from "@bitcredit/ai-credit-shared";
import { defineMessages } from "react-intl";

export const intelligenceMessages = defineMessages({
  boundary: {
    id: "intelligence.boundary",
    defaultMessage: "Context for people. Not used by pricing, gates or the AI interview.",
    description: "Mint Intelligence is never decision input",
  },
  authored: {
    id: "intelligence.authored",
    defaultMessage: "{author} · {date}",
    description: "Who wrote a Mint Intelligence note and when",
  },
  reviewBy: { id: "intelligence.reviewBy", defaultMessage: "Review by {date}", description: "When the note's author expects a refresh" },
  overdue: {
    id: "intelligence.overdue",
    defaultMessage: "Review overdue",
    description: "The note's review date has passed; it may be out of date",
  },
  sources: { id: "intelligence.sources", defaultMessage: "Sources", description: "Sources the note's author cited" },
});

/** Calendar dates compare as text; the review date is the author's own estimate, not an expiry. */
export function intelligenceReviewOverdue(note: Pick<MintIntelligenceNote, "reviewBy">, today: string): boolean {
  return note.reviewBy !== null && note.reviewBy < today;
}

export function todayIsoDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Superseded versions behind a current note, newest first, following each note's `supersedes` link. */
export function supersededChain(note: MintIntelligenceNote, notes: readonly MintIntelligenceNote[]): MintIntelligenceNote[] {
  const byId = new Map(notes.map((item) => [item.id, item]));
  const chain: MintIntelligenceNote[] = [];
  const seen = new Set([note.id]);
  let previous = note.supersedes === null ? undefined : byId.get(note.supersedes);
  while (previous && !seen.has(previous.id)) {
    chain.push(previous);
    seen.add(previous.id);
    previous = previous.supersedes === null ? undefined : byId.get(previous.supersedes);
  }
  return chain;
}
