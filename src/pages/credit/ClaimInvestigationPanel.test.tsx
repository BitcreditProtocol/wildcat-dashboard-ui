import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it } from "vitest";
import { ClaimInvestigationPanel } from "./ClaimInvestigationPanel";
import type { ClaimInvestigationState } from "./decision-types";

const request = {
  schemaVersion: "claim-investigation-start-v1",
  caseId: "case-a",
  snapshotDigest: `sha256:${"a".repeat(64)}`,
  resultDigest: `sha256:${"b".repeat(64)}`,
  inputDigest: `sha256:${"c".repeat(64)}`,
} as const;

let root: Root | undefined;

function render(state: ClaimInvestigationState, queryClient = new QueryClient(), readOnly = false) {
  const mount = document.createElement("div");
  document.body.append(mount);
  root = createRoot(mount);
  act(() => {
    root?.render(
      <QueryClientProvider client={queryClient}>
        <IntlProvider locale="en">
          <ClaimInvestigationPanel state={state} readOnly={readOnly} />
        </IntlProvider>
      </QueryClientProvider>
    );
  });
  return { mount, queryClient };
}

afterEach(() => {
  if (root !== undefined) act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

describe("ClaimInvestigationPanel", () => {
  it("shows automatic progress without exposing a manual research command", () => {
    const { mount } = render({ status: "idle", modelId: "codex:gpt-5.6-luna", request });

    expect(mount.textContent).toContain("In progress");
    expect(mount.textContent).not.toContain("Research public context");
    expect(mount.querySelector("button")).toBeNull();
  });

  it("does not offer public research for a retained historical assessment", () => {
    const { mount } = render({ status: "idle", modelId: "codex:gpt-5.6-luna", request }, new QueryClient(), true);

    expect(mount.textContent).not.toContain("Research public context");
    expect(mount.querySelector("button")).toBeNull();
  });

  it("keeps public results compact, authority-bounded, and non-clickable", () => {
    const evidence = {
      reference: `sha256:${"d".repeat(64)}`,
      label: "business-record.pdf",
      contentDigest: `sha256:${"d".repeat(64)}`,
      origin: "applicant_upload" as const,
    };
    const { mount } = render({
      status: "available",
      proposal: {
        schemaVersion: "claim-investigation-proposal-v1",
        caseId: request.caseId,
        snapshotDigest: request.snapshotDigest,
        resultDigest: request.resultDigest,
        inputDigest: request.inputDigest,
        promptVersion: "public-claim-investigation-v1",
        modelId: "codex:gpt-5.6-luna",
        assessedAt: "2026-08-28T09:00:00.000Z",
        authority: "display_only_model_proposal",
        evidenceAnchors: [evidence],
        searchQueries: ["Buyer Cooperative Guatemala"],
        findings: [
          {
            track: "operational_plausibility",
            status: "public_context",
            claim: {
              source: "applicant_confirmed",
              preparedInputId: "2798c386-935b-4f5e-a2ea-a5323454de0a",
              field: "acceptor",
              value: "Buyer Cooperative",
            },
            summary: "The public page describes common cooperative purchasing structures.",
            sources: [
              {
                title: "Public cooperative directory",
                url: "https://example.com/cooperatives/buyer",
                excerpt: "The directory lists the organization but not the claimed relationship.",
              },
            ],
          },
        ],
      },
    });

    expect(mount.textContent).toContain("1 finding · 1 source");
    expect(mount.textContent).toContain("Supplemental");
    expect(mount.textContent).toContain("Context found");
    expect(mount.textContent).not.toContain("AI proposal");
    expect(mount.textContent).toContain("https://example.com/cooperatives/buyer");
    expect(mount.querySelector("details")?.open).toBe(false);
    expect(mount.querySelector("a")).toBeNull();
    expect(mount.querySelector("button")).toBeNull();
  });
});
