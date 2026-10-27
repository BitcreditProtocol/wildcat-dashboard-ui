import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MintCheckError,
  mintCheckKeys,
  readBillSignerReview,
  readCreditPolicy,
  searchParticipantDirectory,
  useAddMintIntelligenceNote,
  useBillSignerReview,
  useFacilityOnboardingChecks,
} from "./api";
import {
  directoryFixture,
  fixtureApplicationId,
  fixtureQuoteId,
  intelligenceFixture,
  onboardingChecksFixture,
  policyFixture,
  signerReviewFixture,
} from "./mint-check-test-fixtures";
import { cleanup, flush, json, renderWithProviders, requestBody, routeFetch } from "./mint-check-test-render";

vi.mock("@/lib/api-client", () => ({ authenticatedFetch: (path: string, init?: RequestInit) => fetch(path, init) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function Probe<T>({ use, onChange }: { use: () => T; onChange: (value: T) => void }) {
  const value = use();
  useEffect(() => {
    onChange(value);
  }, [onChange, value]);
  return null;
}

describe("mint check requests", () => {
  it("posts the quote id and parses the signer review", async () => {
    const request = vi.fn(routeFetch({ "/api/ai-credit/bill-signer-review": () => json(signerReviewFixture()) }));
    vi.stubGlobal("fetch", request);
    const review = await readBillSignerReview(fixtureQuoteId);
    expect(review.parties.map((party) => party.name)).toEqual(["Finca Verde", "Carlos Ruiz"]);
    const [, init] = request.mock.calls[0] ?? [];
    expect(init?.method).toBe("POST");
    expect(requestBody(init)).toEqual({ quoteId: fixtureQuoteId });
  });

  it("rejects a response that does not match the shared contract", async () => {
    vi.stubGlobal(
      "fetch",
      routeFetch({ "/api/ai-credit/bill-signer-review": () => json({ ...signerReviewFixture(), historyAvailable: "yes" }) })
    );
    await expect(readBillSignerReview(fixtureQuoteId)).rejects.toMatchObject({ name: "ZodError" });
  });

  it("keeps the HTTP status of a failed check", async () => {
    vi.stubGlobal("fetch", routeFetch({ "/api/ai-credit/credit-policy": () => new Response(null, { status: 503 }) }));
    const error = await readCreditPolicy().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(MintCheckError);
    expect((error as MintCheckError).status).toBe(503);
    vi.stubGlobal("fetch", routeFetch({ "/api/ai-credit/credit-policy": () => json(policyFixture()) }));
    expect((await readCreditPolicy()).programs).toHaveLength(1);
  });

  it("trims and bounds the directory query before sending it", async () => {
    const request = vi.fn(routeFetch({ "/api/ai-credit/participant-directory": () => json(directoryFixture()) }));
    vi.stubGlobal("fetch", request);
    await searchParticipantDirectory(`  ${"x".repeat(250)}  `);
    expect(requestBody(request.mock.calls[0]?.[1])).toEqual({ query: "x".repeat(200) });
  });
});

describe("mint check hooks", () => {
  it("exposes parsed onboarding checks and a typed error", async () => {
    vi.stubGlobal("fetch", routeFetch({ "/api/ai-credit/facility-onboarding-checks": () => json(onboardingChecksFixture()) }));
    const states: ReturnType<typeof useFacilityOnboardingChecks>[] = [];
    await renderWithProviders(
      <Probe use={() => useFacilityOnboardingChecks(fixtureApplicationId, 3)} onChange={(state) => states.push(state)} />
    );
    expect(states[states.length - 1]?.data?.directory.size).toBe(12);
    cleanup();

    vi.stubGlobal("fetch", routeFetch({ "/api/ai-credit/bill-signer-review": () => new Response(null, { status: 503 }) }));
    const reviews: ReturnType<typeof useBillSignerReview>[] = [];
    await renderWithProviders(<Probe use={() => useBillSignerReview(fixtureQuoteId)} onChange={(state) => reviews.push(state)} />);
    expect(reviews[reviews.length - 1]?.error).toBeInstanceOf(MintCheckError);
    expect(reviews[reviews.length - 1]?.data).toBeUndefined();
  });

  it("does not ask for a signer review without a quote", async () => {
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    await renderWithProviders(<Probe use={() => useBillSignerReview(undefined)} onChange={() => undefined} />);
    expect(request).not.toHaveBeenCalled();
  });

  it("replaces the cached intelligence with the response to an added note", async () => {
    const updated = intelligenceFixture();
    vi.stubGlobal("fetch", routeFetch({ "/api/ai-credit/mint-intelligence": () => json(updated) }));
    let add: ReturnType<typeof useAddMintIntelligenceNote> | undefined;
    const { client } = await renderWithProviders(<Probe use={useAddMintIntelligenceNote} onChange={(value) => (add = value)} />);
    add?.mutate({
      action: "add_note",
      commandId: "88888888-8888-4888-8888-888888888888",
      scope: "macro",
      subject: "Inflation",
      title: "Inflation eased",
      body: "Consumer prices rose less than expected.",
      sources: [],
      reviewBy: null,
      supersedes: null,
    });
    await flush();
    expect(client.getQueryData(mintCheckKeys.intelligence)).toEqual(updated);
  });

  it("never serves one application revision's checks for another", async () => {
    vi.stubGlobal("fetch", routeFetch({ "/api/ai-credit/facility-onboarding-checks": () => json(onboardingChecksFixture()) }));
    const { client } = await renderWithProviders(
      <Probe use={() => useFacilityOnboardingChecks(fixtureApplicationId, 3)} onChange={() => undefined} />
    );
    expect(client.getQueryData(mintCheckKeys.onboardingChecks(fixtureApplicationId, 3))).toBeDefined();
    // A profile update bumps the revision: the earlier result is not reused for it.
    expect(client.getQueryData(mintCheckKeys.onboardingChecks(fixtureApplicationId, 4))).toBeUndefined();
  });

  it("lets a saved note win over an older intelligence read still in flight", async () => {
    const saved = intelligenceFixture();
    const stale = { ...saved, notes: [], current: [] };
    let releaseRead: (() => void) | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((path: string, init?: RequestInit) => {
        if (path === "/api/ai-credit/mint-intelligence" && init?.method === "POST") return Promise.resolve(json(saved));
        // The first read is slow and stale; later reads return the saved state.
        if (releaseRead === undefined)
          return new Promise<Response>((resolve) => {
            releaseRead = () => resolve(json(stale));
          });
        return Promise.resolve(json(saved));
      })
    );
    let add: ReturnType<typeof useAddMintIntelligenceNote> | undefined;
    const { client } = await renderWithProviders(<Probe use={useAddMintIntelligenceNote} onChange={(value) => (add = value)} />);
    void client.fetchQuery({
      queryKey: mintCheckKeys.intelligence,
      queryFn: () => fetch("/api/ai-credit/mint-intelligence").then((r) => r.json()),
    });
    add?.mutate({
      action: "add_note",
      commandId: "99999999-9999-4999-8999-999999999999",
      scope: "macro",
      subject: "Inflation",
      title: "Inflation eased",
      body: "Consumer prices rose less than expected.",
      sources: [],
      reviewBy: null,
      supersedes: null,
    });
    await flush();
    releaseRead?.();
    await flush();
    expect(client.getQueryData(mintCheckKeys.intelligence)).toEqual(saved);
  });
});
