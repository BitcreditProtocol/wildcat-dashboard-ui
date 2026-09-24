import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "react-intl";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PreferencesProvider } from "@/context/preferences/PreferencesContext";
import type { BillIdentParticipant, BillParticipant, Id, InfoReply } from "@/generated/client/types.gen";
import { messagesByLocale } from "@/i18n/messages";
import type { CaseBrief } from "@/pages/credit/case-brief";
import { QuoteDetailCard } from "./QuoteDetailCard";

const participant: BillIdentParticipant = {
  type: "Company",
  node_id: "node-1",
  name: "ACME Corp",
  country: "AT",
  city: "Vienna",
  address: "Street 1",
  nostr_relays: [],
};

const payee: BillParticipant = {
  Ident: participant,
};

const keysetId: Id = {
  version: "Version00",
  id: {
    V1: [1, 2, 3, 4],
  },
};

vi.mock("@/components/ParticipantsOverview", () => ({
  ParticipantsOverviewCard: () => <div>ParticipantsOverviewMock</div>,
  ParticipantDetail: () => <div>ParticipantDetailMock</div>,
}));

vi.mock("@bitcredit/ui-library", async () => {
  const actual = await vi.importActual<typeof import("@bitcredit/ui-library")>("@bitcredit/ui-library");
  return {
    ...actual,
    TruncatedTextPopover: ({ text }: { text: React.ReactNode }) => <span>{text}</span>,
  };
});

vi.mock("@/components/QRCodeWithErrorBoundary", () => ({
  FeeTokenQRCodeModal: () => <div>FeeTokenQRCodeModalMock</div>,
}));

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let storageData: Record<string, string> = {};

function renderIntoDom(element: ReactElement): HTMLDivElement {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const mountRoot = createRoot(mount);
  act(() => {
    mountRoot.render(element);
  });
  root = mountRoot;
  container = mount;
  return mount;
}

function renderWithProviders(element: ReactElement): HTMLDivElement {
  return renderIntoDom(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <IntlProvider locale="en-US" messages={messagesByLocale["en-US"]}>
        <MemoryRouter>
          <PreferencesProvider>{element}</PreferencesProvider>
        </MemoryRouter>
      </IntlProvider>
    </QueryClientProvider>
  );
}

async function flush() {
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

const baseQuote: InfoReply = {
  id: "quote-1",
  status: "Accepted",
  discounted: 80_000_000,
  bill: {
    id: "bill-1",
    sum: 100_000_000,
    maturity_date: "2026-03-01",
    drawee: participant,
    drawer: participant,
    payee,
    endorsees: [],
    file_urls: [],
  },
  keyset_id: keysetId,
};

const pendingQuote: InfoReply = {
  id: baseQuote.id,
  bill: baseQuote.bill,
  submitted: "2026-08-21T10:00:00.000Z",
  suggested_expiration: "2099-08-23T23:59:59.999Z",
  status: "Pending",
};

function caseBrief(next: CaseBrief["next"], work: CaseBrief["work"] = [], extra: Partial<CaseBrief> = {}): CaseBrief {
  return {
    next,
    work,
    support: { invoice: "consistent", acceptorRiskRecord: false, duplicateCheckClear: false },
    repaymentUnverified: false,
    ...extra,
  };
}

type CardProps = Parameters<typeof QuoteDetailCard>[0];

/** Text of each provenance column, in order; the columns are the sections whose headings are h2 beside the terms strip. */
const FACT_HEADINGS = ["Signed eBill record", "Applicant's claims", "Checked against applicant documents", "Independent of the applicant"];
function factColumns(page: HTMLElement): (string | null | undefined)[] {
  return [...page.querySelectorAll("section")]
    .filter((section) => FACT_HEADINGS.includes(section.querySelector(":scope > h2")?.textContent ?? ""))
    .map((section) => section.textContent);
}

function renderCard(props: Partial<CardProps>): HTMLDivElement {
  return renderWithProviders(
    <QuoteDetailCard
      quote={pendingQuote}
      effectiveQuoteStatus="Pending"
      ebillPaid={false}
      isMintComplete={false}
      isMintCompleteLoading={false}
      showPayment={false}
      rejectedToPay={false}
      isInMempool={false}
      requestedToPay={false}
      {...props}
    />
  );
}

afterEach(() => {
  // React keeps timers running until the tree unmounts, and vitest tears the jsdom
  // environment down right after the last test — unmount here so nothing fires after it.
  if (root && container) {
    act(() => {
      root?.unmount();
    });
    container.remove();
    root = null;
    container = null;
  }
});

beforeEach(() => {
  vi.clearAllMocks();
  storageData = {};
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storageData[key] ?? null,
      setItem: (key: string, value: string) => {
        storageData[key] = value;
      },
      removeItem: (key: string) => {
        delete storageData[key];
      },
    },
  });
});

describe("QuoteDetailCard", () => {
  it("states the decision, the reason and the operator's next step, linking the evidence review once", () => {
    const page = renderCard({
      actions: <button type="button">Close — unable to assess</button>,
      decisionSummary: {
        assessmentCurrency: "current",
        brief: caseBrief({ kind: "review_evidence", count: 3 }, [
          { kind: "evidence_review", toReview: 3, noReply: 0, unavailable: 0, reviewed: 0 },
        ]),
      },
    });
    const header = page.querySelector("header");
    expect(header?.querySelector("h1")?.textContent).toBe("Evidence review needed");
    expect(header?.textContent).toContain(
      "3 applicant replies have not been checked against the documents. Terms stay paused until each one is reviewed."
    );
    expect(header?.textContent).toContain("Next step · You");
    expect(header?.textContent).not.toContain("No action needed from you");
    const reviewLinks = page.querySelectorAll('header a[href="#evidence-questions"]');
    expect(reviewLinks).toHaveLength(1);
    expect(reviewLinks[0]?.textContent).toBe("Open evidence review");
    // Governed controls sit in the next-step panel; QuoteActions decides which are collapsed exceptions.
    expect(header?.querySelector('[aria-labelledby="case-next-step"]')?.textContent).toContain("Close — unable to assess");
    expect(page.textContent).not.toContain("What needs to happen next");
    expect(page.textContent).not.toContain("Residual uncertainty");
    expect(page.querySelector('header a[href="/bills/bill-1"]')?.textContent).toBe("View eBill");
    const printReference = [...page.querySelectorAll("header span")].find((element) => element.classList.contains("print:block"));
    expect(printReference?.textContent).toBe("bill-1");
  });

  it("says when the operator need not intervene and who owns the blocker", () => {
    const page = renderCard({
      decisionSummary: {
        assessmentCurrency: "current",
        brief: caseBrief({ kind: "wait_mint_risk" }, [
          {
            kind: "verification",
            owner: "mint_risk",
            reasonCode: "verification_acceptor_loss_parameters_required",
            requiredItem: "Current governed acceptor probability of default and loss given default",
            axis: "acceptor_repayment_risk",
          },
        ]),
      },
    });
    const header = page.querySelector("header");
    expect(header?.querySelector("h1")?.textContent).toBe("Mint risk record missing");
    expect(header?.textContent).toContain("no current default and loss estimate for the payer, ACME Corp");
    expect(header?.textContent).toContain("Next step · Mint risk");
    expect(header?.textContent).toContain("No action needed from you");
    expect(header?.textContent).toContain("it cannot be entered here");
    const progress = page.querySelector('[aria-labelledby="case-progress"]');
    expect(progress?.textContent).toContain("Acceptor risk evidence missingMint risk");
    expect(progress?.textContent?.match(/Current governed acceptor probability of default and loss given default/g)).toHaveLength(1);
  });

  it("shows what agents, the applicant and reviewers did, each with its owner and drill-down", () => {
    const page = renderCard({
      decisionSummary: {
        assessmentCurrency: "current",
        brief: caseBrief({ kind: "review_evidence", count: 3 }, [
          { kind: "answer_review", state: "not_run", proposed: 0 },
          { kind: "public_research", state: "available", findings: 4, sources: 3, searches: 4 },
          { kind: "proposals", count: 2 },
          { kind: "applicant", state: "replied", at: "2026-09-22T10:17:00.000Z", submissions: 3 },
          { kind: "evidence_review", toReview: 3, noReply: 0, unavailable: 1, reviewed: 1 },
        ]),
      },
    });
    const progress = page.querySelector('[aria-labelledby="case-progress"]');
    const rows = [...(progress?.querySelectorAll("li") ?? [])].map((row) => row.textContent);
    expect(rows[0]).toContain("Answer reviewAgentLatest submission not reviewed · automatic reviews for this case have stopped");
    expect(rows[1]).toContain("4 findings · 3 sources · 4 searches · context only, not verification");
    expect(rows[2]).toContain("2 questions not sent · optional · an approver chooses whether to send them");
    expect(rows[3]).toContain("Applicant follow-upApplicantReplied");
    expect(rows[3]).toContain("3 submissions");
    expect(rows[4]).toContain("Evidence reviewYou3 replies to check · 1 evidence unavailable · 1 supported");
    const links = [...(progress?.querySelectorAll("a") ?? [])].map((link) => link.getAttribute("href"));
    expect(links).toEqual([
      "#case-history",
      "#case-investigation",
      "#public-research",
      "#proposed-follow-ups",
      "#case-conversation",
      "#evidence-questions",
    ]);
  });

  it("does not show case progress or a next step after an evidence-insufficient closure", () => {
    const page = renderCard({
      quote: { id: baseQuote.id, bill: baseQuote.bill, status: "Denied", tstamp: "2026-09-13T00:00:00.000Z" },
      effectiveQuoteStatus: "Denied",
      decisionSummary: {
        assessmentCurrency: "current",
        brief: caseBrief({ kind: "closed" }, [{ kind: "proposals", count: 2 }]),
      },
    });
    expect(page.querySelector("h1")?.textContent).toBe("Unable to assess");
    expect(page.textContent).toContain("Material evidence unavailable · no adverse finding");
    expect(page.textContent).not.toContain("Next step");
    expect(page.textContent).not.toContain("questions not sent");
    expect(page.querySelector('a[href="#proposed-follow-ups"]')).toBeNull();
  });

  it("shows only confirmed payment outside the collapsed audit details, without implying redemption", () => {
    const paid = renderWithProviders(
      <QuoteDetailCard
        quote={baseQuote}
        effectiveQuoteStatus="Accepted"
        ebillPaid
        isMintComplete={false}
        isMintCompleteLoading={false}
        showPayment
        rejectedToPay={false}
        isInMempool={false}
        requestedToPay
      />
    );
    const audit = [...paid.querySelectorAll("details")].find((element) =>
      element.querySelector(":scope > summary")?.textContent?.includes("Processing & audit")
    );
    expect(audit?.open).toBe(false);
    expect(paid.querySelector("h1")?.textContent).toBe("Accepted");
    expect(paid.querySelector("header")?.textContent).toContain("Paid");
    expect(paid.querySelector("header")?.textContent).not.toContain("Redemption");
    expect(audit?.textContent).not.toContain("Paid");
    expect(audit?.textContent).not.toContain("Redemption");
    act(() => root?.unmount());
    container?.remove();

    const requested = renderWithProviders(
      <QuoteDetailCard
        quote={baseQuote}
        effectiveQuoteStatus="MintingEnabled"
        ebillPaid={false}
        isMintComplete={false}
        isMintCompleteLoading={false}
        showPayment
        rejectedToPay={false}
        isInMempool={false}
        requestedToPay
      />
    );
    expect(requested.querySelector("header")?.textContent).toContain("Payment requested");
    expect(requested.textContent).not.toContain("Paid");
    expect(requested.textContent).not.toContain("Redemption");
  });

  it("uses the direct eBill payment query only as payment confirmation", () => {
    const page = renderWithProviders(
      <QuoteDetailCard
        quote={baseQuote}
        effectiveQuoteStatus="Accepted"
        ebillPaid={false}
        isMintComplete={true}
        isMintCompleteLoading={false}
        showPayment={false}
        rejectedToPay={false}
        isInMempool={false}
        requestedToPay={false}
      />
    );
    expect(page.querySelector("header")?.textContent).toContain("Paid");
    expect(page.querySelector("header")?.textContent).not.toContain("Redemption");
  });

  it("says the assessment is loading instead of claiming none exists", () => {
    const page = renderCard({ assessmentLoading: true });
    expect(page.querySelector('[role="status"]')?.textContent).toBe("Loading the case assessment…");
    expect(page.textContent).not.toContain("No business assessment");
  });

  it("marks a retained assessment read-only and suppresses its stale terms", () => {
    const page = renderCard({
      decisionSummary: {
        assessmentCurrency: "historical",
        useOfFunds: "Fertilizer",
        repaymentSource: "Coffee sales",
        brief: caseBrief({ kind: "wait_reassessment" }),
        recommendedTerms: {
          mintingFee: 266_000,
          amountAvailableForMinting: 7_734_000,
          feeRatioBps: 333,
          tenorDays: 180,
          offerExpiresOn: "2099-08-23",
        },
      },
    });

    expect(page.querySelector("h1")?.textContent).toBe("Assessment not current");
    expect(page.textContent).toContain("Historical assessment · read-only");
    expect(page.textContent).toContain("Decisions stay disabled until a current assessment is available.");
    expect(page.textContent).not.toContain("7,734,000");
  });

  it("keeps eBill facts, claims, applicant-document checks and independent records apart, without implying payment", () => {
    const page = renderCard({
      quote: baseQuote,
      effectiveQuoteStatus: "Accepted",
      decisionSummary: {
        assessmentCurrency: "current",
        useOfFunds: "Fertilizer and seasonal workers",
        repaymentSource: "Coffee harvest sales",
        billAcceptanceState: "accepted",
        brief: caseBrief({ kind: "decide_offer", offerExpiresOn: "2099-08-24" }, [], {
          support: { invoice: "consistent", acceptorRiskRecord: true, duplicateCheckClear: true },
          repaymentUnverified: true,
        }),
      },
    });

    expect(page.querySelector("h1")?.textContent).toBe("Accepted");
    expect(page.querySelector("header")?.textContent).toContain(
      "The holder accepted the offer. This is not minting, issued value or eBill payment."
    );
    // After the Mint decides, the quote status leads and no pending next step is suggested.
    expect(page.textContent).not.toContain("Next step");
    expect(page.textContent).not.toContain("Case progress");
    expect(page.textContent).toContain("Available to mint80,000,000sat");
    expect(page.textContent).toContain("Fee20,000,000sat");
    expect(factColumns(page)).toEqual([
      "Signed eBill recordAccepted by the payerPayer at maturityACME CorpDrawerACME Corp",
      "Applicant's claimsUse of proceedsFertilizer and seasonal workersRepayment sourceCoffee harvest salesUnresolved · not independently confirmed",
      "Checked against applicant documentsInvoice fields match the eBill",
      "Independent of the applicantMint-signed risk record for the payerNo other financing of this bill in Mint records",
    ]);
    expect(page.textContent).not.toContain("Independently supported");
    expect(page.textContent).not.toContain("independently verified");
    expect(page.textContent?.match(/not independently confirmed/g)).toHaveLength(1);
    expect(page.textContent?.match(/Coffee harvest sales/g)).toHaveLength(1);
    expect(page.textContent).not.toContain("Full answer");
    expect(page.textContent).not.toContain("Residual uncertainty");
    expect(page.querySelectorAll("details[data-print-statement]")).toHaveLength(0);
    expect(page.textContent).toContain("Processing & audit");
    expect(page.textContent).toContain("eBillAccepted");
    expect(page.textContent).toContain("ApplicantAccepted quote");
    expect(page.textContent).toContain("Mint operationUnavailable");
    expect(page.querySelector("details")?.open).toBe(false);
    expect(page.querySelector('button[aria-label="Print summary"]')).not.toBeNull();
    expect(page.textContent).toContain("Drawee:");
    expect(page.textContent).toContain("Drawer:");
    expect(page.textContent).toContain("Payee:");
    expect(page.textContent?.match(/ParticipantDetailMock/g)).toHaveLength(3);
  });

  it("says when no independent record exists and keeps a failed invoice check with the applicant's documents", () => {
    const page = renderCard({
      decisionSummary: {
        assessmentCurrency: "current",
        useOfFunds: "Fertilizer",
        brief: caseBrief({ kind: "send_applicant_request", count: 1 }, [], {
          support: { invoice: "conflict", acceptorRiskRecord: false, duplicateCheckClear: false },
          repaymentUnverified: true,
        }),
      },
    });

    const [, claims, documents, independent] = factColumns(page);
    expect(claims).toBe(
      "Applicant's claimsUse of proceedsFertilizerRepayment sourceNo answer recordedUnresolved · not independently confirmed"
    );
    expect(documents).toBe("Checked against applicant documentsInvoice does not match the eBill");
    expect(independent).toBe("Independent of the applicantNone recorded");
  });

  it("presents current governed terms as ready for the operator's decision", () => {
    const page = renderCard({
      actions: <button type="button">Offer</button>,
      decisionSummary: {
        assessmentCurrency: "current",
        useOfFunds: "Fertilizer",
        repaymentSource: "Coffee sales",
        brief: caseBrief({ kind: "decide_offer", offerExpiresOn: "2099-08-24" }, [{ kind: "proposals", count: 2 }]),
        recommendedTerms: {
          mintingFee: 272_000,
          amountAvailableForMinting: 7_928_000,
          feeRatioBps: 332,
          tenorDays: 180,
          offerExpiresOn: "2099-08-24",
        },
      },
    });

    expect(page.querySelector("h1")?.textContent).toBe("Ready for your decision");
    expect(page.textContent).toContain("All required checks passed. Terms valid through 2099-08-24.");
    expect(page.textContent).toContain("Next step · YouOffer the proposed terms or decline.Offer");
    expect(page.textContent).toContain("Fee272,000sat");
    expect(page.textContent).toContain("3.32% of bill over 180 days");
    expect(page.textContent).toContain("Available to mint7,928,000sat");
    // Optional proposals stay visible in progress without displacing the decision.
    expect(page.textContent).toContain("2 questions not sent · optional");
  });

  it("holds an expired governed offer instead of presenting it as actionable", () => {
    const page = renderCard({
      decisionSummary: {
        assessmentCurrency: "current",
        useOfFunds: "Fertilizer",
        repaymentSource: "Coffee sales",
        brief: caseBrief({ kind: "terms_expired", offerExpiresOn: "2000-01-01" }),
        recommendedTerms: {
          mintingFee: 272_000,
          amountAvailableForMinting: 7_928_000,
          feeRatioBps: 332,
          tenorDays: 180,
          offerExpiresOn: "2000-01-01",
        },
      },
    });

    expect(page.querySelector("h1")?.textContent).toBe("Terms expired");
    expect(page.textContent).toContain("Expired 2000-01-01 · awaiting applicant request");
    expect(page.textContent).toContain("Next step · Applicant");
    expect(page.textContent).toContain("Fee—");
    expect(page.textContent).toContain("Available to mint—");
    expect(page.textContent).not.toContain("7,928,000");
  });

  it("explains a no-fit recommendation with the governed reason", () => {
    const page = renderCard({
      noFitExplanation: <span>Product unavailable</span>,
      decisionSummary: { assessmentCurrency: "current", brief: caseBrief({ kind: "confirm_no_fit" }) },
    });

    expect(page.querySelector("h1")?.textContent).toBe("No offer recommended");
    expect(page.querySelector("header")?.textContent).toContain("Product unavailable");
    expect(page.textContent).toContain("Confirm the no-fit result with Deny");
  });

  it("names outstanding applicant checks in plain words and keeps the exact request once", () => {
    const page = renderCard({
      decisionSummary: {
        assessmentCurrency: "current",
        brief: caseBrief({ kind: "send_applicant_request", count: 1 }, [
          {
            kind: "verification",
            owner: "applicant",
            reasonCode: "verification_recourse_acknowledgment_required",
            requiredItem: "Acknowledge whole-face recourse",
            axis: "applicant_recourse_risk",
          },
        ]),
      },
    });

    expect(page.querySelector("h1")?.textContent).toBe("Applicant information needed");
    expect(page.textContent).toContain("Outstanding: Recourse acknowledgement missing.");
    expect(page.textContent).toContain("Requests after submission are not sent automatically.");
    expect(page.textContent?.match(/Acknowledge whole-face recourse/g)).toHaveLength(1);
    expect(page.textContent).not.toContain("Previous assessment");
  });

  it("shows the exact verified authorization receipt returned by the Mint command", () => {
    const page = renderWithProviders(
      <QuoteDetailCard
        quote={{ ...baseQuote, status: "Offered", ttl: "2099-09-02T23:59:59.999Z" }}
        effectiveQuoteStatus="Offered"
        ebillPaid={false}
        isMintComplete={false}
        isMintCompleteLoading={false}
        showPayment={false}
        rejectedToPay={false}
        isInMempool={false}
        requestedToPay={false}
        signedAuthorizationReceipt={{
          keyId: "synthetic-testnet-key-1",
          mintId: "mint-demo",
          mintQuoteId: "quote-1",
          billId: "bill-1",
          action: "request_to_mint",
          expiresAt: "2099-09-02T23:59:59.999Z",
          authorizationDigest: `sha256:${"c".repeat(64)}`,
        }}
      />
    );

    expect(page.textContent).toContain("Processing & audit");
    expect(page.textContent).toContain("Offer expires");
    expect(page.textContent).not.toContain("Authorization verified");
    expect(page.textContent).toContain("AuthorizationSigned command verified");
    expect(page.textContent).toContain("ApplicantAwaiting response");
    expect(page.textContent).toContain("synthetic-testnet-key-1");
    expect(page.textContent).not.toContain("sha256:");
    expect(page.textContent).toContain("request_to_mint");
    expect(page.textContent).toContain("mint-demo / bill-1 / quote-1");
    expect(page.textContent).toMatch(/Expires2099-09-0[23] \d{2}:59/u);
  });

  it("shows the durable execution receipt and real Treasury minting progress after reload", () => {
    const page = renderWithProviders(
      <QuoteDetailCard
        quote={{ ...baseQuote, status: "MintingEnabled", fee: { value: 20_000_000, unit: null } }}
        effectiveQuoteStatus="MintingEnabled"
        ebillPaid={false}
        isMintComplete={false}
        isMintCompleteLoading={false}
        showPayment={false}
        rejectedToPay={false}
        isInMempool={false}
        requestedToPay={false}
        durableAuthorizationReceipt={{
          operationId: `sha256:${"a".repeat(64)}`,
          status: "completed",
          completedAt: "2026-08-21T12:06:00.000Z",
          resultDigest: `sha256:${"b".repeat(64)}`,
          effectId: "quote-1",
          authorizationDigest: `sha256:${"c".repeat(64)}`,
          mintId: "mint-demo",
          billId: "bill-1",
          action: "request_to_mint",
        }}
        mintOperationStatus={{
          kid: keysetId,
          quote_id: "quote-1",
          target: 80_000_000,
          current: 80_000_000,
        }}
      />
    );

    expect(page.textContent).toContain("Processing & audit");
    expect(page.textContent).not.toContain("Audit receipt saved");
    expect(page.textContent).toContain("Authorizationcompleted");
    expect(page.textContent).toContain("Mint operationComplete · 80,000,000 / 80,000,000");
    expect(page.textContent).toContain("Execution statuscompleted");
    expect(page.textContent).toContain("Completed at2026-08-21T12:06:00.000Z");
    expect(page.textContent).toContain("Effect IDquote-1");
    expect(page.textContent).not.toContain("sha256:");
    expect(page.textContent).toContain("Exact scoperequest_to_mintmint-demo / bill-1");
    expect(page.textContent).not.toContain("Signing key");
    expect(page.textContent).not.toContain("Expires");
  });

  it("renders primary sat values with secondary eur conversions when rates are available", async () => {
    storageData["user-preferences"] = JSON.stringify({ currency: "eur" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              rates: {
                USD: "100000",
                EUR: "90000",
              },
            },
          }),
      })
    );

    const page = renderWithProviders(
      <QuoteDetailCard
        quote={baseQuote}
        effectiveQuoteStatus="Accepted"
        ebillPaid={true}
        isMintComplete={true}
        isMintCompleteLoading={false}
        showPayment={false}
        rejectedToPay={false}
        isInMempool={false}
        requestedToPay={false}
      />
    );

    await flush();

    expect(page.textContent).toContain("100,000,000");
    expect(page.textContent).toContain("sat");
    expect(page.textContent).toContain("90,000.00");
    expect(page.textContent).toContain("eur");
    expect(page.textContent).toContain("72,000.00");
    expect(page.textContent).toContain("18,000.00");
  });

  it("falls back to sat-only values when fiat rates are unavailable", async () => {
    storageData["user-preferences"] = JSON.stringify({ currency: "eur" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: () => Promise.resolve("Bad Request"),
      })
    );

    const page = renderWithProviders(
      <QuoteDetailCard
        quote={baseQuote}
        effectiveQuoteStatus="Accepted"
        ebillPaid={true}
        isMintComplete={true}
        isMintCompleteLoading={false}
        showPayment={false}
        rejectedToPay={false}
        isInMempool={false}
        requestedToPay={false}
      />
    );

    await flush();

    expect(page.textContent).toContain("100,000,000");
    expect(page.textContent).toContain("sat");
    expect(page.textContent).not.toContain("eur");
  });
});
