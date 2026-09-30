import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { Link, MemoryRouter, useLocation } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, getByLabelText, getByRole } from "@testing-library/dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FacilityCoverage, FacilityOperatorCommand } from "@bitcredit/ai-credit-shared";
import FacilitiesPage from "./FacilitiesPage";
import { FacilityActions } from "./FacilityActions";
import { FacilityCase } from "./FacilityCase";
import { FacilityCoveragePanel } from "./FacilityCoveragePanel";
import { FacilityAllowance } from "./FacilityAllowance";
import { facilityDigest, facilityFixture } from "./facility-test-fixture";
import keycloak from "@/keycloak";
import { facilityOperatorScope, pendingReassessment } from "./facility-recovery";
import { defaultAgreementExpiryDate } from "./facility-state";

vi.mock("@/lib/api-client", () => ({ authenticatedFetch: (path: string, init?: RequestInit) => fetch(path, init) }));
vi.mock("@/keycloak", () => ({ default: { authenticated: true, subject: "operator-a", tokenParsed: { iss: "https://issuer.test" } } }));
let root: Root | undefined;
let mount: HTMLDivElement | undefined;
let client: QueryClient | undefined;

function RouteLocation() {
  const location = useLocation();
  return (
    <output hidden data-testid="route-location">
      {location.pathname}
      {location.search}
    </output>
  );
}

async function flush() {
  for (let index = 0; index < 6; index += 1)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
}
async function render(element: ReactNode, initialEntry = "/facilities") {
  mount = document.createElement("div");
  document.body.appendChild(mount);
  root = createRoot(mount);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  act(() => {
    root?.render(
      <QueryClientProvider client={client ?? new QueryClient()}>
        <IntlProvider locale="en">
          <MemoryRouter initialEntries={[initialEntry]}>
            {element}
            <RouteLocation />
          </MemoryRouter>
        </IntlProvider>
      </QueryClientProvider>
    );
  });
  await flush();
  return mount;
}
async function click(element: HTMLElement) {
  act(() => {
    fireEvent.click(element);
  });
  await flush();
}
function fill(element: HTMLElement, value: string) {
  act(() => {
    if (element instanceof HTMLInputElement && element.type === "date") fireEvent.change(element, { target: { value } });
    else fireEvent.input(element, { target: { value } });
  });
}
beforeEach(() => {
  sessionStorage.clear();
  keycloak.subject = "operator-a";
  keycloak.authenticated = true;
});
afterEach(() => {
  act(() => root?.unmount());
  mount?.remove();
  client?.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("facility queue and case", () => {
  it("separates multiple accepted quotes, pending offer reservations and remaining capacity with exact links", async () => {
    const binding: FacilityCoverage["binding"] = {
      schemaVersion: "facility-bill-binding-v1",
      facilityId: "11111111-1111-4111-8111-111111111111",
      applicantRef: "farmer",
      mintNodeId: "mint",
      agreementVersion: 2,
      agreementDigest: facilityDigest,
      submissionDigest: facilityDigest,
    };
    const entries: FacilityCoverage["allowance"]["entries"] = [
      {
        binding,
        quoteId: "22222222-2222-4222-8222-222222222222",
        caseId: binding.facilityId,
        billId: "bill-a",
        faceValueSat: "2000000",
        state: "committed",
        decisionResultDigest: facilityDigest,
        observedQuoteStatus: "Accepted",
        updatedAt: "2026-09-29T12:00:00.000Z",
      },
      {
        binding,
        quoteId: "33333333-3333-4333-8333-333333333333",
        caseId: binding.facilityId,
        billId: "bill-b",
        faceValueSat: "1500000",
        state: "committed",
        decisionResultDigest: facilityDigest,
        observedQuoteStatus: "MintingEnabled",
        updatedAt: "2026-09-29T12:00:00.000Z",
      },
      {
        binding,
        quoteId: "44444444-4444-4444-8444-444444444444",
        caseId: binding.facilityId,
        billId: "bill-c",
        faceValueSat: "1000000",
        state: "reserved",
        decisionResultDigest: facilityDigest,
        observedQuoteStatus: "Offered",
        updatedAt: "2026-09-29T12:00:00.000Z",
      },
      {
        binding,
        quoteId: "55555555-5555-4555-8555-555555555555",
        caseId: binding.facilityId,
        billId: "bill-d",
        faceValueSat: "8000000",
        state: "assessed",
        decisionResultDigest: null,
        observedQuoteStatus: "Pending",
        updatedAt: "2026-09-29T12:00:00.000Z",
      },
      {
        binding,
        quoteId: "66666666-6666-4666-8666-666666666666",
        caseId: binding.facilityId,
        billId: "bill-e",
        faceValueSat: "3000000",
        state: "released",
        decisionResultDigest: facilityDigest,
        observedQuoteStatus: "Canceled",
        updatedAt: "2026-09-29T12:00:00.000Z",
      },
    ];
    const page = await render(
      <FacilityAllowance
        allowance={{
          exposureBasis: "whole_bill_face_value",
          limitSat: "6000000",
          reservedSat: "4500000",
          availableSat: "1500000",
          entries,
          syntheticNonBinding: true,
        }}
      />
    );
    const metric = (label: string) =>
      [...page.querySelectorAll("dt")].find((node) => node.textContent === label)?.nextElementSibling?.textContent;
    expect(metric("Accepted quotes (2)")).toBe("3,500,000 sat");
    expect(metric("Reserved for offers (1)")).toBe("1,000,000 sat");
    expect(metric("Remaining allowance")).toBe("1,500,000 sat");
    expect(getByRole(page, "link", { name: "2,000,000 sat eBill" }).getAttribute("href")).toBe(`/quotes/${entries[0]?.quoteId}`);
    expect(page.querySelectorAll("li")).toHaveLength(5);
    expect(page.textContent).toContain("Exceeds remaining allowance · no allowance used");
    expect(page.textContent).toContain("Reservation released");
    expect(page.textContent).toContain("not a wallet balance or proof that money was minted");
  });
  it("shows exact quote coverage, a working agreement link and actionable blockers without AI confidence", async () => {
    const page = await render(
      <FacilityCoveragePanel
        coverage={{
          binding: {
            schemaVersion: "facility-bill-binding-v1",
            facilityId: "11111111-1111-4111-8111-111111111111",
            applicantRef: "farmer",
            mintNodeId: "mint",
            agreementVersion: 2,
            agreementDigest: facilityDigest,
            submissionDigest: facilityDigest,
          },
          status: "blocked",
          blockers: ["allowance_exceeded"],
          allowance: {
            exposureBasis: "whole_bill_face_value",
            limitSat: "6000000",
            reservedSat: "5000000",
            availableSat: "1000000",
            entries: [],
            syntheticNonBinding: true,
          },
          billFaceValueSat: "2000000",
          remainingAfterOfferSat: "0",
          eligibleScope: "Existing milk sales only",
          expiresAt: "2026-10-29T23:59:59.000Z",
          digest: facilityDigest,
          syntheticNonBinding: true,
        }}
      />
    );
    expect(page.textContent).toContain("does not currently cover an offer");
    expect(page.textContent).toContain("Operator: review outstanding offers or a limit change");
    expect(page.textContent).toContain("5,000,000 sat");
    expect(page.textContent).not.toContain("confidence");
    expect(getByRole(page, "link", { name: "Agreement · version 2" }).getAttribute("href")).toBe(
      "/facilities?application=11111111-1111-4111-8111-111111111111"
    );
  });
  it("identifies applications by purpose, name, date and status with stable exact links", async () => {
    const first = facilityFixture();
    const second = facilityFixture({ id: "22222222-2222-4222-8222-222222222222", applicantName: "Second Farm" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ applications: [first, second] }))));
    const page = await render(<FacilitiesPage />);
    expect(page.querySelector("article")).toBeNull();
    expect(getByRole(page, "region", { name: "Facility applications" })).toBeTruthy();
    expect(getByRole(page, "table", { name: "Facility application queue. Open an applicant to review their case." })).toBeTruthy();
    expect(page.textContent).toContain("Pay feed expenses before milk buyers settle");
    expect(page.textContent).toContain("Sep 29");
    expect(page.textContent).toContain("Ready for your review");
    const row = getByRole(page, "link", { name: /Second Farm/ });
    expect(row.getAttribute("href")).toContain(`application=${second.id}`);
    await click(row);
    expect(page.querySelector("article h2")?.textContent).toBe("Second Farm");
    expect(page.querySelector("table")).toBeNull();
    expect(page.querySelector('[data-testid="route-location"]')?.textContent).toContain(`application=${second.id}`);
  });
  it("returns to the queue while preserving search, status, sort and page in the URL", async () => {
    const app = facilityFixture();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ applications: [app] }))))
    );
    const filters = "q=milk&status=operator_review&sort=oldest&page=3";
    const page = await render(<FacilitiesPage />, `/facilities?${filters}&application=${app.id}`);
    expect(page.querySelector("article h2")?.textContent).toBe("Demo Dairy Farm");
    const back = getByRole(page, "link", { name: "Back to applications" });
    await click(back);
    expect(page.querySelector("article")).toBeNull();
    expect(getByRole(page, "table", { name: "Facility application queue. Open an applicant to review their case." })).toBeTruthy();
    const route = page.querySelector('[data-testid="route-location"]')?.textContent;
    expect(route).toBe(`/facilities?${filters}`);
  });
  it("never silently opens another applicant for an unknown deep link", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ applications: [facilityFixture()] }))));
    const page = await render(<FacilitiesPage />, "/facilities?application=missing");
    expect(page.textContent).toContain("This application is not available");
    expect(page.querySelector("article")).toBeNull();
  });
  it("does not claim the queue is empty when the initial read fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    const page = await render(<FacilitiesPage />);
    expect(getByRole(page, "alert").textContent).toContain("Could not load current applications");
    expect(page.textContent).not.toContain("No facility applications yet");
    expect(page.querySelector("article")).toBeNull();
    expect(page.querySelector("table")).toBeNull();
  });
  it("does not carry one applicant's failed action into another applicant's case", async () => {
    const first = facilityFixture();
    const second = facilityFixture({ id: "22222222-2222-4222-8222-222222222222", applicantName: "Second Farm" });
    vi.stubGlobal(
      "fetch",
      vi.fn((_path: string, init?: RequestInit) =>
        Promise.resolve(
          init?.method === "POST" ? new Response(null, { status: 502 }) : new Response(JSON.stringify({ applications: [first, second] }))
        )
      )
    );
    const page = await render(
      <>
        <FacilitiesPage />
        <Link to={`/facilities?application=${second.id}`}>Open second case directly</Link>
        <Link to={`/facilities?application=${first.id}`}>Return to first case directly</Link>
      </>,
      `/facilities?application=${first.id}`
    );
    await click(getByRole(page, "button", { name: "Ask the applicant" }));
    fill(getByLabelText(page, "Your question"), "Which buyer settles your invoices?");
    await click(getByRole(page, "button", { name: "Send question" }));
    expect(page.textContent).toContain("The action could not be confirmed");
    await click(getByRole(page, "link", { name: "Open second case directly" }));
    expect(page.querySelector("article h2")?.textContent).toBe("Second Farm");
    expect(page.textContent).not.toContain("The action could not be confirmed");
    await click(getByRole(page, "link", { name: "Return to first case directly" }));
    expect(page.textContent).toContain("The action could not be confirmed");
  });
  it("links statement findings to the actual answer in the immutable submission", async () => {
    const page = await render(<FacilityCase application={facilityFixture()} live busy={false} onCommand={vi.fn()} />);
    expect(page.textContent).toContain("Applicant statement · not independently verified");
    expect(page.textContent).not.toMatch(/confidence.*%/iu);
    await click(getByRole(page, "link", { name: "Read answer · submission 1" }));
    const answer = page.querySelector("#facility-submission-1-message-1");
    expect(answer?.textContent).toContain("Our buyer pays every Friday.");
    expect(document.activeElement).toBe(answer);
  });
  it("labels the applicant's stated timing with the same words the applicant sees", async () => {
    const page = await render(<FacilityCase application={facilityFixture()} live busy={false} onCommand={vi.fn()} />);
    expect(page.textContent).toContain("Payment timing");
    expect(page.textContent).not.toContain("Payment cycle");
  });
  it("does not label a legacy consent pause as ready for operator approval", async () => {
    const app = facilityFixture();
    if (!app.assessment) throw new Error("Expected assessment");
    app.assessment.stopReason = "consent_required";
    app.progress = {
      nextActor: "applicant",
      reason: "Permission is needed for automatic follow-up.",
      nextStep: "Review the updated sharing choice in eBill.",
    };
    const page = await render(<FacilityCase application={app} live busy={false} onCommand={vi.fn()} />);
    expect(page.textContent).toContain("Waiting for applicant permission");
    expect(page.textContent).toContain("Next: Applicant");
    expect(page.textContent).not.toContain("Prepare agreement");
  });
  it("labels an expired agreement clearly and preserves exact terms", async () => {
    const app = facilityFixture({
      status: "agreement_accepted",
      agreementStatus: "expired",
      currentAgreement: {
        version: 1,
        digest: `sha256:${"b".repeat(64)}`,
        submissionVersion: 1,
        submissionDigest: facilityDigest,
        terms: { limitSat: "12000000", expiresAt: "2026-01-31T23:59:59.000Z", eligibleScope: "Accepted milk-sale eBills only" },
        basis: "Reviewed synthetic buyer and sales context.",
        operatorRef: "reviewer",
        offeredAt: "2026-01-01T00:00:00.000Z",
        acceptedAt: "2026-01-02T00:00:00.000Z",
        syntheticNonBinding: true,
      },
    });
    const page = await render(<FacilityCase application={app} live busy={false} onCommand={vi.fn()} />);
    expect(page.textContent).toContain("Expired — not reusable");
    expect(page.textContent).toContain("12,000,000 sat");
    expect(page.textContent).toContain("Accepted milk-sale eBills only");
    expect(page.textContent).toContain("not a minting authorization");
  });
  it("keeps cached records read-only after a failed current read", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    const page = await render(<FacilitiesPage />, `/facilities?application=${facilityFixture().id}`);
    act(() => {
      client?.setQueryData(["ai-credit", "facility-applications"], [facilityFixture()]);
    });
    await act(async () => {
      await client?.invalidateQueries({ queryKey: ["ai-credit", "facility-applications"] });
    });
    await flush();
    expect(page.textContent).toContain("read-only until you refresh successfully");
    expect(getByRole(page, "button", { name: "Prepare agreement" })).toBeDisabled();
  });
  it("keeps agreement expiry at the entered UTC day and time even in a next-day timezone", async () => {
    const expiresAt = "2026-10-29T23:59:59.000Z";
    const app = facilityFixture({
      status: "agreement_offered",
      agreementStatus: "offered",
      currentAgreement: {
        version: 1,
        digest: `sha256:${"b".repeat(64)}`,
        submissionVersion: 1,
        submissionDigest: facilityDigest,
        terms: { limitSat: "12000000", expiresAt, eligibleScope: "Accepted milk-sale eBills only" },
        basis: "Reviewed synthetic buyer and sales context.",
        operatorRef: "reviewer",
        offeredAt: "2026-09-29T10:00:00.000Z",
        acceptedAt: null,
        syntheticNonBinding: true,
      },
    });
    const page = await render(
      <IntlProvider locale="en" timeZone="Pacific/Kiritimati">
        <FacilityCase application={app} live busy={false} onCommand={vi.fn()} />
      </IntlProvider>
    );
    const expected = new Intl.DateTimeFormat("en", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" }).format(
      new Date(expiresAt)
    );
    expect(page.textContent).toContain("Valid until (UTC)");
    expect(Array.from(page.querySelectorAll("dd")).map((item) => item.textContent)).toContain(expected);
    expect(expected).toContain("Oct 29");
    expect(expected).toContain("11:59");
  });
  it("describes applicant review from the operator perspective", async () => {
    const app = facilityFixture({
      status: "review",
      progress: { nextActor: "applicant", reason: "Your answers are ready", nextStep: "Review your summary" },
    });
    const page = await render(<FacilityCase application={app} live busy={false} onCommand={vi.fn()} />);
    expect(page.textContent).toContain("The applicant is reviewing their summary before submitting.");
    expect(page.textContent).toContain("No action is needed from you.");
    expect(page.textContent).not.toContain("Your answers are ready");
  });
  it.each([
    [
      "agreement_offered",
      "The applicant reviews and accepts this exact agreement version.",
      "No operator action is required while you wait for their acceptance.",
    ],
    ["agreement_accepted", "The applicant has accepted this agreement version.", "No operator action is required now."],
  ] as const)("describes %s without asking the operator to accept", async (status, reason, nextStep) => {
    const app = facilityFixture({
      status,
      progress: {
        nextActor: status === "agreement_offered" ? "applicant" : "none",
        reason: "Your agreement is ready",
        nextStep: "Review its scope, illustrative sat limit and expiry before accepting this exact version",
      },
    });
    const page = await render(<FacilityCase application={app} live busy={false} onCommand={vi.fn()} />);
    expect(page.textContent).toContain(reason);
    expect(page.textContent).toContain(nextStep);
    expect(page.textContent).not.toContain("before accepting this exact version");
    expect(app.progress.nextStep).toContain("before accepting this exact version");
  });
});

describe("operator assessment recovery", () => {
  it("replays the exact operator command after provider failure, pending refresh and remount", async () => {
    let application = facilityFixture();
    const commands: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((_path: string, init?: RequestInit) => {
        if (init?.method === "POST") {
          if (typeof init.body !== "string") throw new Error("Expected JSON command body");
          commands.push(JSON.parse(init.body));
          if (commands.length === 1) {
            application = { ...application, status: "assessing", pending: true };
            return Promise.resolve(new Response(JSON.stringify({ error: "Provider unavailable" }), { status: 502 }));
          }
          application = { ...application, status: "operator_review", pending: false, revision: 5 };
          return Promise.resolve(new Response(JSON.stringify(application)));
        }
        return Promise.resolve(new Response(JSON.stringify({ applications: [application] })));
      })
    );
    let page = await render(<FacilitiesPage />, `/facilities?application=${application.id}`);
    const disclosure = page.querySelector("article details");
    if (disclosure instanceof HTMLDetailsElement) disclosure.open = true;
    await click(getByRole(page, "button", { name: "Reassess current submission" }));
    expect(commands).toHaveLength(1);
    expect(application.pending).toBe(true);
    expect(getByRole(page, "button", { name: "Retry assessment" })).not.toBeDisabled();
    expect(pendingReassessment(facilityOperatorScope(), application)).toEqual(commands[0]);
    act(() => root?.unmount());
    mount?.remove();
    client?.clear();
    page = await render(<FacilitiesPage />, `/facilities?application=${application.id}`);
    expect(getByRole(page, "button", { name: "Retry assessment" })).not.toBeDisabled();
    await click(getByRole(page, "button", { name: "Retry assessment" }));
    expect(commands).toHaveLength(2);
    expect(commands[1]).toEqual(commands[0]);
    expect(page.textContent).not.toContain("Retry assessment");
    expect(sessionStorage.length).toBe(0);
  });
  it("does not send an assessment when the exact retry record cannot be persisted", async () => {
    const request = vi.fn((_path: string, init?: RequestInit) => {
      if (init?.method === "POST") throw new Error("Must not transmit");
      return Promise.resolve(new Response(JSON.stringify({ applications: [facilityFixture()] })));
    });
    vi.stubGlobal("fetch", request);
    const page = await render(<FacilitiesPage />, `/facilities?application=${facilityFixture().id}`);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
    const disclosure = page.querySelector("article details");
    if (disclosure instanceof HTMLDetailsElement) disclosure.open = true;
    await click(getByRole(page, "button", { name: "Reassess current submission" }));
    expect(page.textContent).toContain("assessment request was not sent");
    expect(request.mock.calls.every(([, init]) => init?.method !== "POST")).toBe(true);
  });
});

describe("facility operator forms", () => {
  async function renderActions(app = facilityFixture()) {
    const sent: FacilityOperatorCommand[] = [];
    const page = await render(
      <FacilityActions
        application={app}
        live
        busy={false}
        onCommand={(command) => {
          sent.push(command);
          return Promise.resolve();
        }}
      />
    );
    return { page, sent };
  }
  it("sends an applicant question with snapshot binding and no decision basis", async () => {
    const { page, sent } = await renderActions();
    await click(getByRole(page, "button", { name: "Ask the applicant" }));
    expect(page.querySelector('textarea[name="basis"]')).toBeNull();
    fill(getByLabelText(page, "Your question"), "Which buyer settles your invoices?");
    await click(getByRole(page, "button", { name: "Send question" }));
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      action: "request_information",
      question: "Which buyer settles your invoices?",
      expectedRevision: 4,
      submissionDigest: facilityDigest,
    });
    expect(sent[0]).not.toHaveProperty("basis");
  });
  it.each([null, 30, 730])("sends the one-year default or the operator's %s-day override", async (days) => {
    const { page, sent } = await renderActions();
    await click(getByRole(page, "button", { name: "Prepare agreement" }));
    const expiry = getByLabelText(page, /Valid until/);
    expect(expiry).toHaveValue(defaultAgreementExpiryDate());
    expect(expiry).not.toHaveAttribute("max");
    expect(page.textContent).toContain("Defaults to one year. You can choose a shorter or longer period.");
    const selected = days === null ? defaultAgreementExpiryDate() : new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
    if (days !== null) fill(expiry, selected);
    fill(getByLabelText(page, "Maximum outstanding amount (sat)"), "12000000");
    fill(getByLabelText(page, "Eligible eBills and conditions"), "Milk-sale eBills to the named cooperative only.");
    fill(getByLabelText(page, /Decision basis/), "Reviewed submitted buyer and payment details with remaining uncertainty.");
    await click(getByRole(page, "checkbox", { name: /I reviewed these terms/ }));
    fireEvent.click(getByRole(page, "button", { name: "Send agreement for acceptance" }));
    await flush();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ action: "approve", terms: { expiresAt: `${selected}T23:59:59.000Z` } });
  });
  it.each([
    [false, false],
    [true, false],
    [true, true],
  ])("requires explicit terms, basis and acknowledgement (coverage=%s, revision=%s)", async (billCoverage, revision) => {
    const { page, sent } = await renderActions(
      revision ? facilityFixture({ status: "agreement_offered", agreementStatus: "offered" }) : facilityFixture()
    );
    await click(getByRole(page, "button", { name: revision ? "Revise agreement" : "Prepare agreement" }));
    expect(getByRole(page, "button", { name: "Send agreement for acceptance" })).toBeEnabled();
    await click(getByRole(page, "button", { name: "Send agreement for acceptance" }));
    expect(sent).toHaveLength(0);
    fill(getByLabelText(page, "Maximum outstanding amount (sat)"), "12000000");
    fill(getByLabelText(page, /Valid until/), new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10));
    fill(getByLabelText(page, "Eligible eBills and conditions"), "Milk-sale eBills to the named cooperative only.");
    fill(getByLabelText(page, /Decision basis/), "Reviewed submitted buyer and payment details with remaining uncertainty.");
    if (billCoverage) {
      await click(getByRole(page, "checkbox", { name: "Enable allowance checks for future eBills" }));
      fill(getByLabelText(page, "Maximum per eBill (sat)"), "4000000");
      fill(getByLabelText(page, "Maximum days to maturity"), "180");
    }
    await click(getByRole(page, "button", { name: "Send agreement for acceptance" }));
    expect(sent).toHaveLength(0);
    await click(getByRole(page, "checkbox", { name: /I reviewed these terms/ }));
    expect(page.querySelector("form")?.checkValidity()).toBe(true);
    expect(getByRole(page, "checkbox", { name: /I reviewed these terms/ })).toBeChecked();
    const send = getByRole(page, "button", { name: "Send agreement for acceptance" });
    // Native event timing: do not batch the entire async form validation inside act.
    fireEvent.click(send);
    await flush();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      action: "approve",
      expectedRevision: 4,
      submissionDigest: facilityDigest,
      terms: { limitSat: "12000000", eligibleScope: "Milk-sale eBills to the named cooperative only." },
    });
    if (billCoverage)
      expect(sent[0]).toMatchObject({
        terms: {
          billRules: {
            version: "facility-bill-rules-v1",
            exposureBasis: "whole_bill_face_value",
            maxBillSat: "4000000",
            maxTenorDays: 180,
            payerScope: "any_payer_subject_to_bill_review",
            eligiblePayerRefs: [],
          },
        },
      });
    else expect(sent[0]).not.toHaveProperty("terms.billRules");
  });
  it("does not offer decision actions when the latest assessment is absent", async () => {
    const { page } = await renderActions(facilityFixture({ assessment: null }));
    expect(page.textContent).not.toContain("Prepare agreement");
    expect(page.textContent).not.toContain("Decline application");
    expect(page.textContent).toContain("Ask the applicant");
  });
  it("keeps a decision basis for decline without forcing agreement terms", async () => {
    const { page, sent } = await renderActions();
    const disclosure = page.querySelector("details");
    if (disclosure) disclosure.open = true;
    await click(getByRole(page, "button", { name: "Decline application" }));
    expect(page.querySelector('input[name="limitSat"]')).toBeNull();
    fill(getByLabelText(page, /Decision basis/), "The reviewed case does not meet the synthetic scope for this mint.");
    await click(getByRole(page, "button", { name: "Confirm decline" }));
    expect(sent[0]).toMatchObject({
      action: "decline",
      submissionDigest: facilityDigest,
      basis: "The reviewed case does not meet the synthetic scope for this mint.",
    });
  });
  it("retains an idempotency key when retrying the same uncertain command", async () => {
    const sent: FacilityOperatorCommand[] = [];
    const page = await render(
      <FacilityActions
        application={facilityFixture()}
        live
        busy={false}
        onCommand={(command) => {
          sent.push(command);
          return Promise.reject(new Error("uncertain"));
        }}
      />
    );
    await click(getByRole(page, "button", { name: "Ask the applicant" }));
    fill(getByLabelText(page, "Your question"), "Which buyer pays?");
    await click(getByRole(page, "button", { name: "Send question" }));
    await click(getByRole(page, "button", { name: "Send question" }));
    expect(sent).toHaveLength(2);
    expect(sent[0]).toEqual(sent[1]);
  });
});
