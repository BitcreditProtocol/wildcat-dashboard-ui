import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { MemoryRouter, useLocation, useSearchParams } from "react-router";
import { fireEvent, getAllByRole, getByPlaceholderText, getByRole, queryByRole } from "@testing-library/dom";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { FacilityApplication } from "@bitcredit/ai-credit-shared";
import { FacilityQueue } from "./FacilityQueue";
import { facilityFixture } from "./facility-test-fixture";

const applications = Array.from({ length: 300 }, (_, index) => {
  const number = index + 1;
  const base = facilityFixture();
  if (!base.summary) throw new Error("Expected synthetic facility summary");
  return facilityFixture({
    id: `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`,
    applicantName: `Synthetic Farm ${number}`,
    applicantRef: `synthetic-farm-${number}`,
    status: number % 2 === 0 ? "information_requested" : "operator_review",
    summary: { ...base.summary, purpose: `Pay feed expenses for herd ${number}` },
    updatedAt: new Date(Date.UTC(2026, 8, 29, 10, 0, index)).toISOString(),
  });
});
let root: Root | undefined;
let mount: HTMLDivElement | undefined;
const scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
beforeAll(() => Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() }));
afterAll(() => {
  if (scrollDescriptor) Object.defineProperty(HTMLElement.prototype, "scrollIntoView", scrollDescriptor);
  else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});

function QueueHarness({ items }: { items: readonly FacilityApplication[] }) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  return (
    <>
      <FacilityQueue applications={items} params={params} onParamsChange={(next, replace) => setParams(next, { replace })} />
      <output hidden data-testid="location">
        {location.pathname}
        {location.search}
      </output>
    </>
  );
}

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function render(initialEntry = "/facilities?sort=name") {
  mount = document.createElement("div");
  document.body.appendChild(mount);
  root = createRoot(mount);
  const page = mount;
  const rerender = async (items: readonly FacilityApplication[]) => {
    act(() => {
      root?.render(
        <IntlProvider locale="en">
          <MemoryRouter initialEntries={[initialEntry]}>
            <QueueHarness items={items} />
          </MemoryRouter>
        </IntlProvider>
      );
    });
    await flush();
  };
  await rerender(applications);
  return { page, rerender };
}

async function click(element: HTMLElement) {
  act(() => {
    fireEvent.click(element);
  });
  await flush();
}

async function search(page: HTMLElement, value: string) {
  act(() => {
    fireEvent.input(getByPlaceholderText(page, /Search applications/), { target: { value } });
  });
  await flush();
}

async function select(page: HTMLElement, name: string, option: string) {
  act(() => {
    fireEvent.keyDown(getByRole(page, "combobox", { name }), { key: "ArrowDown" });
  });
  await flush();
  await click(getByRole(document.body, "option", { name: option }));
}

function locationParams(page: HTMLElement) {
  const location = page.querySelector('[data-testid="location"]')?.textContent;
  return new URLSearchParams(location?.split("?")[1]);
}

afterEach(() => {
  act(() => root?.unmount());
  mount?.remove();
});

describe("facility queue agreement column", () => {
  const digest = `sha256:${"a".repeat(64)}`;
  const agreement = (billRules: boolean): NonNullable<FacilityApplication["currentAgreement"]> => ({
    version: 1,
    digest,
    submissionVersion: 1,
    submissionDigest: digest,
    terms: {
      limitSat: "6000000",
      expiresAt: "2099-01-01T00:00:00.000Z",
      eligibleScope: "eBills drawn on the cooperative for delivered milk.",
      ...(billRules
        ? {
            billRules: {
              version: "facility-bill-rules-v1" as const,
              exposureBasis: "whole_bill_face_value" as const,
              maxBillSat: "3000000",
              maxTenorDays: 60,
              payerScope: "any_payer_subject_to_bill_review" as const,
              eligiblePayerRefs: [],
            },
          }
        : {}),
    },
    basis: "Regular fortnightly cooperative payments.",
    operatorRef: "operator",
    offeredAt: "2026-09-20T10:00:00.000Z",
    acceptedAt: "2026-09-21T10:00:00.000Z",
    syntheticNonBinding: true,
  });
  const allowance = {
    exposureBasis: "whole_bill_face_value" as const,
    limitSat: "6000000",
    reservedSat: "2100000",
    availableSat: "3900000",
    entries: [],
    syntheticNonBinding: true as const,
  };
  const accepted = (name: string, overrides: Partial<FacilityApplication>) =>
    facilityFixture({
      id: `00000000-0000-4000-8000-0000000009${String(name.length).padStart(2, "0")}`,
      applicantName: name,
      status: "agreement_accepted",
      agreementStatus: "accepted",
      allowance,
      ...overrides,
    });

  it("shows remaining allowance only where the agreement can cover a bill", async () => {
    const { page, rerender } = await render();
    await rerender([
      accepted("Rules", { currentAgreement: agreement(true), identityAssurance: "ebill_identity_key_proof" }),
      accepted("Background only", { currentAgreement: agreement(false), identityAssurance: "ebill_identity_key_proof" }),
      accepted("Unproven identity holder", { currentAgreement: agreement(true), identityAssurance: "synthetic_unverified" }),
    ]);
    const row = (name: string) => getByRole(page, "link", { name }).closest("tr")?.textContent ?? "";
    expect(row("Rules")).toContain("6,000,000 sat");
    expect(row("Rules")).toContain("3,900,000 sat remaining");
    expect(row("Background only")).toContain("6,000,000 sat");
    expect(row("Background only")).not.toContain("remaining");
    expect(row("Unproven identity holder")).not.toContain("remaining");
    expect(row("Unproven identity holder")).toContain("Identity control not proven");
  });
});

describe("facility queue at presentation scale", () => {
  it("renders at most 20 of 300 records and moves between bounded pages", async () => {
    const { page } = await render();
    expect(page.querySelectorAll("tbody tr")).toHaveLength(20);
    expect(getAllByRole(page, "link")).toHaveLength(20);
    expect(getByRole(page, "status")).toHaveTextContent("1–20 of 300 applications");
    expect(getByRole(page, "button", { name: "Previous" })).toBeDisabled();
    expect(getByRole(page, "button", { name: "Next" })).toBeEnabled();
    expect(getByRole(page, "link", { name: "Synthetic Farm 1" })).toBeInTheDocument();
    expect(queryByRole(page, "link", { name: "Synthetic Farm 21" })).not.toBeInTheDocument();

    await click(getByRole(page, "button", { name: "Next" }));
    expect(locationParams(page).get("page")).toBe("2");
    expect(page.querySelectorAll("tbody tr")).toHaveLength(20);
    expect(getByRole(page, "status")).toHaveTextContent("21–40 of 300 applications");
    expect(queryByRole(page, "link", { name: "Synthetic Farm 1" })).not.toBeInTheDocument();
    expect(getByRole(page, "link", { name: "Synthetic Farm 21" })).toBeInTheDocument();

    await click(getByRole(page, "button", { name: "Previous" }));
    expect(getByRole(page, "status")).toHaveTextContent("1–20 of 300 applications");
    expect(getByRole(page, "button", { name: "Previous" })).toBeDisabled();
  });

  it("preserves queue context in each exact case link and stops at the final page", async () => {
    const { page } = await render("/facilities?q=Synthetic&sort=name&page=15");
    expect(getByRole(page, "status")).toHaveTextContent("281–300 of 300 applications");
    expect(getByRole(page, "button", { name: "Next" })).toBeDisabled();
    expect(page.querySelectorAll("tbody tr")).toHaveLength(20);
    for (const app of applications.slice(280)) {
      expect(getByRole(page, "link", { name: app.applicantName })).toHaveAttribute(
        "href",
        `/facilities?q=Synthetic&sort=name&page=15&application=${app.id}`
      );
    }
    const last = applications[applications.length - 1];
    if (!last) throw new Error("Expected synthetic application fixture");
    await click(getByRole(page, "link", { name: last.applicantName }));
    expect(locationParams(page).get("application")).toBe(last.id);
    expect(locationParams(page).get("page")).toBe("15");
  });

  it("searches all records by purpose, including an applicant outside the current page, and resets paging", async () => {
    const { page } = await render("/facilities?sort=name&page=7");
    expect(queryByRole(page, "link", { name: "Synthetic Farm 287" })).not.toBeInTheDocument();
    await search(page, "herd 287");
    expect(getByRole(page, "status")).toHaveTextContent("1–1 of 1 application · 300 total");
    expect(getAllByRole(page, "link")).toHaveLength(1);
    expect(getByRole(page, "link", { name: "Synthetic Farm 287" })).toBeInTheDocument();
    expect(locationParams(page).get("q")).toBe("herd 287");
    expect(locationParams(page).has("page")).toBe(false);
    expect(locationParams(page).get("sort")).toBe("name");
    expect(queryByRole(page, "navigation", { name: "Application pages" })).not.toBeInTheDocument();
  });

  it("distinguishes an empty filtered result and clears filters without losing the sort choice", async () => {
    const { page } = await render("/facilities?q=no-matching-farm&status=operator_review&sort=oldest&page=8");
    expect(page.querySelectorAll("tbody tr")).toHaveLength(0);
    expect(page.textContent).toContain("No applications match these filters.");
    expect(getByRole(page, "status")).toHaveTextContent("0–0 of 0 applications · 300 total");
    await click(getByRole(page, "button", { name: "Clear filters" }));
    expect(locationParams(page).toString()).toBe("sort=oldest");
    expect(page.querySelectorAll("tbody tr")).toHaveLength(20);
    expect(getByRole(page, "status")).toHaveTextContent("1–20 of 300 applications");
    expect(queryByRole(page, "button", { name: "Clear filters" })).not.toBeInTheDocument();
  });

  it("resets to page one when changing status and sort through the shared controls", async () => {
    const { page } = await render("/facilities?sort=name&page=7");
    await select(page, "Status", "Waiting for the applicant");
    expect(locationParams(page).has("page")).toBe(false);
    expect(locationParams(page).get("status")).toBe("information_requested");
    expect(getByRole(page, "status")).toHaveTextContent("1–20 of 150 applications · 300 total");
    expect(queryByRole(page, "link", { name: "Synthetic Farm 1" })).not.toBeInTheDocument();
    expect(getByRole(page, "link", { name: "Synthetic Farm 2" })).toBeInTheDocument();
    await click(getByRole(page, "button", { name: "Next" }));
    await select(page, "Sort", "Recently updated");
    expect(locationParams(page).has("page")).toBe(false);
    expect(locationParams(page).get("sort")).toBe("recent");
    expect(getAllByRole(page, "link")[0]).toHaveTextContent("Synthetic Farm 300");
  });

  it("clamps the displayed page after the available records shrink instead of showing a false empty result", async () => {
    const { page, rerender } = await render("/facilities?sort=name&page=15");
    expect(getByRole(page, "status")).toHaveTextContent("281–300 of 300 applications");
    await rerender(applications.slice(0, 25));
    expect(getByRole(page, "status")).toHaveTextContent("21–25 of 25 applications");
    expect(page.querySelectorAll("tbody tr")).toHaveLength(5);
    expect(getByRole(page, "button", { name: "Next" })).toBeDisabled();
    expect(page.textContent).toContain("Page 2 of 2");
    await click(getByRole(page, "button", { name: "Previous" }));
    expect(locationParams(page).get("page")).toBe("1");
    expect(getByRole(page, "status")).toHaveTextContent("1–20 of 25 applications");
    await rerender(applications.slice(0, 7));
    expect(getByRole(page, "status")).toHaveTextContent("1–7 of 7 applications");
    expect(queryByRole(page, "navigation", { name: "Application pages" })).not.toBeInTheDocument();
  });
});
