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

/** Each certainty column's facts, as "level: fact | source", in order: established first, then the applicant's word or open. */
function certainty(page: HTMLElement): string[][] {
  const section = page.querySelector('section[aria-labelledby="case-certainty-title"]');
  return [...(section?.querySelectorAll("ul") ?? [])].map((list) =>
    [...list.querySelectorAll("li")].map((item) => {
      const [level, text, source] = [...item.querySelectorAll(":scope > span > span")].map((part) => part.textContent ?? "");
      return `${level.replace(/: $/, "")}: ${text} | ${source}`;
    })
  );
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
        synthetic: false,
        brief: caseBrief({ kind: "review_evidence", count: 3 }, [
          { kind: "evidence_review", toReview: 3, noReply: 0, unavailable: 0, reviewed: 0 },
        ]),
      },
    });
    const header = page.querySelector("header");
    expect(header?.querySelector("[data-case-headline]")?.textContent).toBe("Needs your attention");
    expect(header?.textContent).toContain(
      "3 applicant replies have not been checked against the documents. Terms stay paused until each one is reviewed."
    );
    expect(header?.textContent).toContain("Next step · You");
    expect(header?.textContent).not.toContain("No action needed from you");
    const reviewLinks = page.querySelectorAll('header a[href="#evidence-questions"]');
    expect(reviewLinks).toHaveLength(1);
    expect(reviewLinks[0]?.textContent).toBe("Open evidence review");
    // Governed controls sit in the next-step panel; QuoteActions decides which are collapsed exceptions.
    const nextStep = [...(header?.querySelectorAll("section[aria-labelledby]") ?? [])].find((section) =>
      section.querySelector("h2")?.textContent?.startsWith("Next step")
    );
    // The section is labelled by its own heading (a generated id, unique when the step renders twice).
    expect(nextStep?.getAttribute("aria-labelledby")).toBe(nextStep?.querySelector("h2")?.id);
    expect(nextStep?.textContent).toContain("Close — unable to assess");
    expect(page.textContent).not.toContain("What needs to happen next");
    expect(page.textContent).not.toContain("Residual uncertainty");
    expect(page.querySelector('header a[href="#bill-record"]')?.textContent).toBe("View eBill");
    const printReference = [...page.querySelectorAll("header span")].find((element) => element.classList.contains("print:block"));
    expect(printReference?.textContent).toBe("bill-1");
  });

  it("says when the operator need not intervene and who owns the blocker", () => {
    const page = renderCard({
      decisionSummary: {
        assessmentCurrency: "current",
        synthetic: false,
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
    expect(header?.querySelector("[data-case-headline]")?.textContent).toBe("Mint evidence missing");
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
        synthetic: false,
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
        synthetic: false,
        brief: caseBrief({ kind: "closed" }, [{ kind: "proposals", count: 2 }]),
      },
    });
    expect(page.querySelector("[data-case-headline]")?.textContent).toBe("Unable to assess");
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
    expect(paid.querySelector("[data-case-headline]")?.textContent).toBe("Accepted");
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
        synthetic: false,
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

    expect(page.querySelector("[data-case-headline]")?.textContent).toBe("Preparing the case");
    expect(page.textContent).toContain("Historical assessment · read-only");
    expect(page.textContent).toContain("Decisions stay disabled until a current assessment is available.");
    expect(page.textContent).not.toContain("7,734,000");
  });

  it.each(["assessmentUnavailable", "assessmentLoading"] as const)("fails closed with cached terms when %s", (flag) => {
    const page = renderCard({
      [flag]: true,
      decisionSummary: {
        assessmentCurrency: "current",
        synthetic: false,
        useOfFunds: "Fertilizer",
        repaymentSource: "Coffee sales",
        brief: caseBrief({ kind: "decide_offer", offerExpiresOn: "2099-08-23" }),
        recommendedTerms: {
          mintingFee: 266_000,
          amountAvailableForMinting: 7_734_000,
          feeRatioBps: 333,
          tenorDays: 180,
          offerExpiresOn: "2099-08-23",
        },
      },
    });
    expect(page.textContent).not.toContain("7,734,000");
    expect(page.textContent).not.toContain("Approval available");
  });

  it("puts exact blockers, owners and next steps before the source detail", () => {
    const page = renderCard({
      decisionSummary: {
        assessmentCurrency: "current",
        synthetic: false,
        useOfFunds: "Fertilizer",
        repaymentSource: "Coffee sales",
        brief: caseBrief({ kind: "wait_applicant" }, [], { outstanding: [{ item: "When will the buyer pay?", action: "reply" }] }),
      },
    });
    const header = page.querySelector("header")?.textContent;
    expect(header).toContain("Approval unavailable");
    expect(header).toContain("When will the buyer pay?");
    expect(header).toContain("Applicant · reply in eBill; then reassessment");
    expect(header).not.toContain("confidence");
  });

  it("separates permitted residual uncertainty from blockers before sign-off", () => {
    const page = renderCard({
      decisionSummary: {
        assessmentCurrency: "current",
        synthetic: false,
        useOfFunds: "Fertilizer",
        repaymentSource: "Coffee sales",
        brief: caseBrief({ kind: "decide_offer", offerExpiresOn: "2099-08-23" }, [], { repaymentUnverified: true }),
      },
    });
    expect(page.querySelector("header")?.textContent).toContain("Approval available · offer not sent");
    expect(page.querySelector("header")?.textContent).toContain("Uncertainty you would accept");
    expect(page.querySelector("header")?.textContent).not.toContain("What is holding this up");
  });

  it("keeps eBill facts, claims, applicant-document checks and independent records apart, without implying payment", () => {
    const page = renderCard({
      quote: baseQuote,
      effectiveQuoteStatus: "Accepted",
      decisionSummary: {
        assessmentCurrency: "current",
        synthetic: false,
        useOfFunds: "Fertilizer and seasonal workers",
        repaymentSource: "Coffee harvest sales",
        billAcceptanceState: "accepted",
        brief: caseBrief({ kind: "decide_offer", offerExpiresOn: "2099-08-24" }, [], {
          support: { invoice: "consistent", acceptorRiskRecord: true, duplicateCheckClear: true },
          repaymentUnverified: true,
        }),
      },
    });

    expect(page.querySelector("[data-case-headline]")?.textContent).toBe("Accepted");
    expect(page.querySelector("header")?.textContent).toContain(
      "The holder accepted the offer. This is not minting, issued value or eBill payment."
    );
    // After the Mint decides, the quote status leads and no pending next step is suggested.
    expect(page.textContent).not.toContain("Next step");
    expect(page.textContent).not.toContain("Case progress");
    expect(page.textContent).toContain("Available to mint80,000,000sat");
    expect(page.textContent).toContain("Fee20,000,000sat");
    // Every fact names what backs it; acceptance and records never read as payment.
    expect(certainty(page)).toEqual([
      [
        "Recorded independently of the applicant: ACME Corp accepted the eBill and owes it at maturity | eBill record · acceptance, not ability to pay",
        "Recorded independently of the applicant: Payer risk recorded by the Mint | Mint-signed record, corroborated · not a guarantee of payment",
        "Recorded independently of the applicant: No other financing of this bill found | Mint records only, not other Mints",
        "Consistent with the applicant's documents: Invoice matches the eBill | Applicant's document, not independent confirmation",
      ],
      [
        "Applicant's word: Uses the funds for: Fertilizer and seasonal workers | Applicant's interview answer",
        "Applicant's word: How the bill gets paid: Coffee harvest sales | Applicant's interview answer",
      ],
    ]);
    expect(page.textContent).not.toContain("Independently supported");
    // Without the record's evidence level, nothing is claimed about it.
    expect(page.textContent).not.toContain("independently verified");
    expect(page.textContent?.match(/Applicant's interview answer/g)).toHaveLength(2);
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
    // Party details sit with each party beside the case and in the bill record, not in processing & audit.
    expect(page.textContent).not.toContain("ParticipantDetailMock");
  });

  it("says when no independent record exists and keeps a failed invoice check with the applicant's documents", () => {
    const page = renderCard({
      decisionSummary: {
        assessmentCurrency: "current",
        synthetic: false,
        useOfFunds: "Fertilizer",
        brief: caseBrief({ kind: "send_applicant_request", count: 1 }, [], {
          support: { invoice: "conflict", acceptorRiskRecord: false, duplicateCheckClear: false },
          repaymentUnverified: true,
        }),
      },
    });

    // A missing Mint record, a failed invoice check and an unknown acceptance are open, never established.
    expect(page.textContent).toContain("Nothing is established by a record or document yet.");
    const [uncertain] = certainty(page);
    // A blank answer is a gap, not a statement.
    expect(uncertain).toEqual([
      "Open: Payer acceptance is not in this assessment | eBill record · acceptance, not ability to pay",
      "Open: No record of the payer's risk | Mint records only, not other Mints",
      "Open: Invoice conflicts with the eBill | Applicant's document, not independent confirmation",
      "Open: How the bill gets paid: no answer recorded | Applicant's interview answer",
      "Applicant's word: Uses the funds for: Fertilizer | Applicant's interview answer",
    ]);
  });

  it("presents current governed terms as ready for the operator's decision", () => {
    const page = renderCard({
      actions: <button type="button">Offer</button>,
      decisionSummary: {
        assessmentCurrency: "current",
        synthetic: false,
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

    expect(page.querySelector("[data-case-headline]")?.textContent).toBe("Offer ready for approval");
    expect(page.textContent).toContain(
      "The current assessment permits these terms. Review the evidence and any agreement conditions before approval. Terms valid through Aug 24, 2099."
    );
    expect(page.textContent).toContain("Next step · YouOffer the proposed terms or decline.Offer");
    expect(page.textContent).toContain("Proposed minting fee272,000sat");
    expect(page.textContent).toContain("3.32% of the bill · 180 days");
    expect(page.textContent).toContain("Available to mint7,928,000sat");
    // Optional proposals stay visible in progress without displacing the decision.
    expect(page.textContent).toContain("2 questions not sent · optional");
  });

  it("holds an expired governed offer instead of presenting it as actionable", () => {
    const page = renderCard({
      decisionSummary: {
        assessmentCurrency: "current",
        synthetic: false,
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

    expect(page.querySelector("[data-case-headline]")?.textContent).toBe("Terms expired");
    expect(page.textContent).toContain("Expired Jan 1, 2000 · awaiting applicant request");
    expect(page.textContent).toContain("Next step · Applicant");
    expect(page.textContent).toContain("Fee—");
    expect(page.textContent).toContain("Available to mint—");
    expect(page.textContent).not.toContain("7,928,000");
  });

  it("explains a no-fit recommendation with the governed reason", () => {
    const page = renderCard({
      noFitExplanation: <span>Product unavailable</span>,
      decisionSummary: { assessmentCurrency: "current", synthetic: false, brief: caseBrief({ kind: "confirm_no_fit" }) },
    });

    expect(page.querySelector("[data-case-headline]")?.textContent).toBe("No offer recommended");
    expect(page.querySelector("header")?.textContent).toContain("Product unavailable");
    expect(page.textContent).toContain("Confirm the no-fit result with Deny");
  });

  it.each([
    ["review_evidence", "review_reply", "You · check the reply against the documents"],
    ["send_applicant_request", "send_request", "You · send the request to the applicant"],
    ["decide_unresolved", "resolve_evidence", "You · request more evidence or close as unable to assess"],
  ] as const)("shows the operator action for %s rather than asking the applicant to reply again", (kind, action, label) => {
    const page = renderCard({
      decisionSummary: {
        assessmentCurrency: "current",
        synthetic: false,
        brief: caseBrief({ kind, count: 1 }, [], { outstanding: [{ item: "What supports the expected sales?", action }] }),
      },
    });
    const header = page.querySelector("header")?.textContent;
    expect(header).toContain(label);
    expect(header).toContain("Next step · You");
    expect(header).not.toContain("Applicant · reply in eBill");
  });

  it("names outstanding applicant checks once in the header, with detail retained in progress", () => {
    const page = renderCard({
      decisionSummary: {
        assessmentCurrency: "current",
        synthetic: false,
        brief: caseBrief(
          { kind: "send_applicant_request", count: 1 },
          [
            {
              kind: "verification",
              owner: "applicant",
              reasonCode: "verification_recourse_acknowledgment_required",
              requiredItem: "Acknowledge whole-face recourse",
              axis: "applicant_recourse_risk",
            },
          ],
          { outstanding: [{ item: "Acknowledge whole-face recourse", action: "send_request" }] }
        ),
      },
    });

    expect(page.querySelector("[data-case-headline]")?.textContent).toBe("Needs your attention");
    expect(page.querySelector("header")?.textContent).toContain("More information is needed before terms can be offered.");
    expect(page.querySelector("header")?.textContent).not.toContain("Outstanding:");
    expect(page.querySelector("header")?.textContent?.match(/Acknowledge whole-face recourse/g)).toHaveLength(1);
    expect(page.querySelector('details[aria-labelledby="case-progress"]')?.textContent).toContain("Acknowledge whole-face recourse");
    expect(page.textContent).toContain("Requests after submission are not sent automatically.");
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

  it("reads certainty from the records themselves: assessor records, stale records, double financing and contradictions", () => {
    const page = renderCard({
      decisionSummary: {
        assessmentCurrency: "current",
        synthetic: false,
        useOfFunds: "Fertilizer",
        repaymentSource: "The cooperative pays",
        billAcceptanceState: "endorsed",
        acceptorRisk: {
          probabilityOfDefaultBps: 600,
          lossGivenDefaultBps: 4000,
          validThrough: "2026-11-08",
          evidenceState: "independently_verified",
        },
        duplicateCheck: { result: "already_financed", evidenceState: "corroborated" },
        alreadyFinanced: true,
        contradictions: 2,
        brief: caseBrief({ kind: "manual_review" }, [], {
          // The brief's narrower flags must not hide what the records say.
          support: { invoice: "unchecked", acceptorRiskRecord: false, duplicateCheckClear: false },
        }),
      },
    });
    const [established, uncertain] = certainty(page);

    expect(established).toEqual([
      "Recorded independently of the applicant: Payer risk recorded: 6.00% chance of non-payment, 40.00% lost if unpaid | Independent assessor, independently verified · valid through Nov 8, 2026 · not a guarantee of payment",
    ]);
    expect(uncertain).toEqual([
      // An endorsement is not the payer's acceptance.
      "Open: ACME Corp has not accepted the eBill | eBill record · acceptance, not ability to pay",
      // Shown once even though both the check and the bill record say so.
      "Open: This bill is already financed | Mint-signed record, corroborated",
      "Open: 2 unresolved contradictions between claims and records | Deterministic case checks",
      "Open: Invoice not checked yet | Applicant's document, not independent confirmation",
      "Applicant's word: Uses the funds for: Fertilizer | Applicant's interview answer",
      "Applicant's word: How the bill gets paid: The cooperative pays | Applicant's interview answer",
    ]);
    expect(page.textContent).toContain("1 established · 2 applicant's word · 4 open");
  });

  it("marks synthetic test data on the case and on every Mint or assessor record it shows", () => {
    const summary = {
      assessmentCurrency: "current" as const,
      billAcceptanceState: "accepted",
      acceptorRisk: { probabilityOfDefaultBps: 600, lossGivenDefaultBps: 4000, validThrough: "2026-11-08", evidenceState: "corroborated" },
      duplicateCheck: { result: "clear", evidenceState: "independently_verified" },
      brief: caseBrief({ kind: "manual_review" }),
    };
    const synthetic = renderCard({ decisionSummary: { ...summary, synthetic: true } });

    expect(synthetic.querySelector("header [data-synthetic-badge]")?.textContent).toBe("Synthetic test data");
    expect(certainty(synthetic)[0]).toEqual([
      // The eBill chain record and the applicant's documents are not Mint or assessor records.
      "Recorded independently of the applicant: ACME Corp accepted the eBill and owes it at maturity | eBill record · acceptance, not ability to pay",
      "Recorded independently of the applicant: Payer risk recorded: 6.00% chance of non-payment, 40.00% lost if unpaid | Synthetic test data · Mint-signed record, corroborated · valid through Nov 8, 2026 · not a guarantee of payment",
      "Recorded independently of the applicant: No other financing of this bill found | Synthetic test data · Independent assessor, independently verified",
      "Consistent with the applicant's documents: Invoice matches the eBill | Applicant's document, not independent confirmation",
    ]);

    act(() => root?.unmount());
    synthetic.remove();
    const real = renderCard({ decisionSummary: { ...summary, synthetic: false } });

    expect(real.querySelector("[data-synthetic-badge]")).toBeNull();
    expect(real.textContent).not.toContain("Synthetic");
  });

  it("states the applicant's liability as the Mint's fallback and links every fact to the record behind it", () => {
    const summary = {
      assessmentCurrency: "current" as const,
      synthetic: false,
      useOfFunds: "Fertilizer",
      repaymentSource: "The cooperative pays",
      billAcceptanceState: "accepted",
      acceptorRisk: { probabilityOfDefaultBps: 600, lossGivenDefaultBps: 4000, validThrough: "2026-11-08", evidenceState: "corroborated" },
      duplicateCheck: { result: "clear", evidenceState: "corroborated" },
      assessedOn: "2026-10-02",
      brief: caseBrief({ kind: "manual_review" }),
    };
    const page = renderCard({ decisionSummary: { ...summary, recourseAcknowledged: true } });
    const section = page.querySelector('section[aria-labelledby="case-certainty-title"]');

    expect(section?.textContent).toContain("Assessed Oct 2, 2026 · 4 established · 3 applicant's word · 0 open");
    expect(certainty(page)[1]).toContain(
      "Applicant's word: Acknowledged being liable for the whole bill if the payer does not pay | Applicant's confirmation · ability to pay not assessed"
    );
    // Each source opens its record: the eBill, the governed calculation, the documents and the conversation.
    expect([...(section?.querySelectorAll("li") ?? [])].map((item) => item.querySelector("a")?.getAttribute("href"))).toEqual([
      "#bill-record",
      "#full-governed-assessment",
      "#full-governed-assessment",
      "#documents-and-evidence",
      "#case-conversation",
      "#case-conversation",
      "#case-conversation",
    ]);

    act(() => root?.unmount());
    page.remove();
    const missing = renderCard({ decisionSummary: { ...summary, recourseAcknowledged: false } });

    expect(certainty(missing)[1]?.[0]).toBe("Open: Has not acknowledged being liable for the whole bill | Applicant's confirmation");
  });

  it("names a stale payer record as open instead of established", () => {
    const page = renderCard({
      decisionSummary: {
        assessmentCurrency: "current",
        synthetic: false,
        billAcceptanceState: "accepted",
        acceptorRisk: { probabilityOfDefaultBps: 600, lossGivenDefaultBps: 4000, validThrough: "2026-01-01", evidenceState: "stale" },
        brief: caseBrief({ kind: "manual_review" }),
      },
    });

    expect(certainty(page)[1]?.[0]).toBe("Open: Payer risk record is stale | Mint-signed record");
  });

  it("leads with the applicant and the bill, not the status", () => {
    const page = renderCard({
      quote: pendingQuote,
      decisionSummary: {
        assessmentCurrency: "current",
        synthetic: false,
        profile: { industry: "coffee_production", country: "GT" },
        brief: caseBrief({ kind: "manual_review" }),
      },
    });
    const header = page.querySelector("header");

    expect(header?.querySelector("h1")?.textContent).toBe("ACME Corp");
    expect(header?.textContent).toContain("Coffee production · Guatemala");
    expect(header?.textContent).toMatch(/Asks to mint against a 100,000,000 sat eBill payable by ACME Corp on/);
    expect(header?.textContent).toMatch(/Received .*ago|Received yesterday|Received today/);
    // The drawer is the applicant here, so no "Drawn by" clause.
    expect(header?.textContent).not.toContain("Drawn by");
  });

  it("does not show an anonymous holder's node id as a company name", () => {
    const anonymous = {
      ...pendingQuote,
      bill: { ...pendingQuote.bill, endorsees: [{ Anon: { node_id: "bitcrt02anonymous" } }] },
    } as InfoReply;
    const page = renderCard({
      quote: anonymous,
      decisionSummary: { assessmentCurrency: "current", synthetic: false, brief: caseBrief({ kind: "manual_review" }) },
    });
    const header = page.querySelector("header");

    expect(header?.querySelector("h1")?.textContent).toBe("Anonymous holder");
    expect(header?.textContent).toContain("bitcrt02anonymous");
    expect(header?.textContent).toContain("Drawn by ACME Corp.");
  });
});
