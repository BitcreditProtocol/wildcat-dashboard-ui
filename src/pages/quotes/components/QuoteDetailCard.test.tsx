import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "react-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PreferencesProvider } from "@/context/preferences/PreferencesContext";
import type { BillIdentParticipant, BillParticipant, Id, InfoReply } from "@/generated/client/types.gen";
import { messagesByLocale } from "@/i18n/messages";
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
        <PreferencesProvider>{element}</PreferencesProvider>
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
  if (root && container) {
    act(() => {
      root?.unmount();
    });
    container.remove();
    root = null;
    container = null;
  }
});

describe("QuoteDetailCard", () => {
  it("distinguishes the amount available for minting from the Minting fee", () => {
    const page = renderWithProviders(
      <QuoteDetailCard
        quote={baseQuote}
        effectiveQuoteStatus="Accepted"
        ebillPaid={false}
        isMintComplete={false}
        isMintCompleteLoading={false}
        showPayment={false}
        rejectedToPay={false}
        isInMempool={false}
        requestedToPay={false}
        decisionSummary={{
          useOfFunds: "Fertilizer and seasonal workers",
          repaymentSource: "Coffee harvest sales",
          acceptor: "Coffee cooperative",
          goodsDescription: "Coffee crop inputs",
          readyForDecision: true,
          passedChecks: 6,
          totalChecks: 6,
          invoiceExtractedAndMatched: true,
          answersAffirmed: true,
          recourseAcknowledged: true,
          unresolvedContradictions: 0,
          underwritingEvidenceProvenance: "synthetic",
          hasMintPolicyAssignment: true,
          billAcceptanceState: "accepted",
        }}
      />
    );

    expect(page.textContent).toContain("Amount available for minting80,000,000sat");
    expect(page.textContent).toContain("Minting fee20,000,000sat");
    expect(page.textContent).toContain("Use of proceedsFertilizer and seasonal workers");
    expect(page.textContent).toContain("Repayment sourceCoffee harvest sales");
    expect(page.textContent).toContain("Payer at maturityCoffee cooperative");
    expect(page.textContent).toContain("Underlying tradeCoffee crop inputs");
    expect(page.textContent).toContain("Ready for decision");
    expect(page.textContent).toContain("Decision evidence");
    expect(page.textContent).toContain("Synthetic underwriting inputs");
    expect(page.textContent).toContain("Mint policy assigned");
    expect(page.textContent).toContain("Automated checks");
    expect(page.textContent).toContain("6/6 automated policy gates passed");
    expect(page.textContent).toContain("Invoice data extracted and matched");
    expect(page.textContent).toContain("Automated scan found no unresolved contradictions");
    expect(page.textContent).toContain("Applicant attestations");
    expect(page.textContent).toContain("Applicant affirmed the submitted answers");
    expect(page.textContent).toContain("Applicant acknowledged full-bill recourse");
    expect(page.textContent).toContain("Authorization & lifecycle");
    expect(page.textContent).toContain("eBillAccepted");
    expect(page.textContent).toContain("ApplicantAccepted quote");
    expect(page.textContent).toContain("Mint operationUnavailable");
    expect(page.textContent).toContain("Verification receipt unavailable");
    expect(page.querySelector('a[href="#documents-and-evidence"]')?.textContent).toBe("Review source evidence");
    expect(page.querySelector('a[href="#bill-history"]')?.textContent).toBe("Review bill history");
    expect(page.querySelector('a[href="#full-governed-assessment"]')?.textContent).toBe("Open full assessment");
    expect(page.textContent).not.toContain("Invoice reviewed");
    expect(page.querySelector('button[aria-label="Print summary"]')).not.toBeNull();
    expect(page.textContent).toContain("Drawee:");
    expect(page.textContent).toContain("Drawer:");
    expect(page.textContent).toContain("Payee:");
    expect(page.textContent?.match(/ParticipantDetailMock/g)).toHaveLength(3);
    expect(page.textContent).not.toContain("Participants:");
    expect(page.textContent).not.toContain("Accepted. Bill amount");
    expect(page.textContent).not.toContain("Not requested");
    expect(page.textContent).not.toContain("Reference & party details");
    expect(page.textContent).not.toContain("Fee:80,000,000sat");
  });

  it("shows governed recommended terms while the Mint quote is pending", () => {
    const page = renderWithProviders(
      <QuoteDetailCard
        quote={{
          id: baseQuote.id,
          bill: baseQuote.bill,
          submitted: "2026-08-21T10:00:00.000Z",
          suggested_expiration: "2026-08-23T23:59:59.999Z",
          status: "Pending",
        }}
        effectiveQuoteStatus="Pending"
        ebillPaid={false}
        isMintComplete={false}
        isMintCompleteLoading={false}
        showPayment={false}
        rejectedToPay={false}
        isInMempool={false}
        requestedToPay={false}
        decisionSummary={{
          useOfFunds: "Fertilizer",
          repaymentSource: "Coffee sales",
          readyForDecision: true,
          passedChecks: 6,
          totalChecks: 6,
          invoiceExtractedAndMatched: true,
          answersAffirmed: true,
          recourseAcknowledged: true,
          unresolvedContradictions: 0,
          underwritingEvidenceProvenance: "synthetic",
          hasMintPolicyAssignment: true,
          recommendedTerms: {
            mintingFee: 272_000,
            amountAvailableForMinting: 7_928_000,
            feeRatioBps: 332,
            tenorDays: 180,
            offerExpiresOn: "2026-08-24",
          },
        }}
      />
    );

    expect(page.textContent).toContain("Recommended Minting fee272,000sat");
    expect(page.textContent).toContain("3.32% of bill over 180 days");
    expect(page.textContent).toContain("Recommended amount available for minting7,928,000sat");
    expect(page.textContent).toContain("Valid until 2026-08-24");
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

    expect(page.textContent).toContain("Signed command verified");
    expect(page.textContent).toContain("AuthorizationSigned command verified");
    expect(page.textContent).toContain("ApplicantAwaiting response");
    expect(page.textContent).toContain("synthetic-testnet-key-1");
    expect(page.textContent).toContain(`sha256:${"c".repeat(15)}…`);
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

    expect(page.textContent).toContain("Execution receipt persisted");
    expect(page.textContent).toContain("Authorizationcompleted");
    expect(page.textContent).toContain("Mint operationComplete · 80,000,000 / 80,000,000");
    expect(page.textContent).toContain(`Operation IDsha256:${"a".repeat(15)}…`);
    expect(page.textContent).toContain("Execution statuscompleted");
    expect(page.textContent).toContain("Completed at2026-08-21T12:06:00.000Z");
    expect(page.textContent).toContain("Effect IDquote-1");
    expect(page.textContent).toContain(`Authorization digestsha256:${"c".repeat(15)}…`);
    expect(page.textContent).toContain(`Result digestsha256:${"b".repeat(15)}…`);
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
