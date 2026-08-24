import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApplicantHumanReviewCard } from "./ApplicantHumanReviewCard";
import type { ApplicantHumanReviewRecord } from "./decision-types";
import { recordApplicantHumanReviewUpdate } from "./record-operator-decision";

vi.mock("./record-operator-decision", () => ({ recordApplicantHumanReviewUpdate: vi.fn() }));

const review: ApplicantHumanReviewRecord = {
  request: {
    schemaVersion: "applicant-human-review-request-v1",
    requestId: "2798c386-935b-4f5e-a2ea-a5323454de0a",
    caseId: "case-a",
    applicantRef: "applicant-a",
    contestedDecisionResultDigest: `sha256:${"a".repeat(64)}`,
    statement: "Please have another operator review the invoice evidence.",
    requestedAt: "2026-08-24T12:00:00.000Z",
    synthetic: true,
  },
  status: "requested",
  reviewer: null,
  resolution: null,
  writtenBasis: null,
  statusChangedAt: "2026-08-24T12:00:00.000Z",
};

let root: Root | undefined;

afterEach(() => {
  if (root !== undefined) act(() => root?.unmount());
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("ApplicantHumanReviewCard", () => {
  it("shows the separation-of-duties status and starts the bound review", async () => {
    vi.mocked(recordApplicantHumanReviewUpdate).mockResolvedValue({ ok: true });
    const mount = document.createElement("div");
    document.body.append(mount);
    root = createRoot(mount);
    act(() => {
      root?.render(
        <QueryClientProvider client={new QueryClient()}>
          <IntlProvider locale="en">
            <ApplicantHumanReviewCard
              billId="bill-a"
              capability={{ ready: true, operatorId: "reviewer-b", operatorRole: "reviewer" }}
              review={review}
            />
          </IntlProvider>
        </QueryClientProvider>
      );
    });

    expect(mount.textContent).toContain("someone other than the original decision operator");
    const button = [...mount.querySelectorAll("button")].find((candidate) => candidate.textContent === "Start second review");
    expect(button).toBeDefined();
    await act(async () => {
      button?.click();
      await Promise.resolve();
    });

    expect(recordApplicantHumanReviewUpdate).toHaveBeenCalledWith(
      {
        action: "begin_review",
        billId: "bill-a",
        caseId: "case-a",
        contestedDecisionResultDigest: review.request.contestedDecisionResultDigest,
        requestId: review.request.requestId,
      },
      { ready: true, operatorId: "reviewer-b", operatorRole: "reviewer" }
    );
  });
});
