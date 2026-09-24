import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it } from "vitest";
import { CaseHistory } from "./CaseHistory";
import { initialApplication, orphanQuestion, salesQuestion, twoSubmissionCase } from "./case-history.test-fixtures";

let root: Root | undefined;
function render(props: Partial<Parameters<typeof CaseHistory>[0]> = {}) {
  act(() => root?.unmount());
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() =>
    root?.render(
      <IntlProvider locale="en">
        <CaseHistory decisionCase={twoSubmissionCase} initialApplication={initialApplication} {...props} />
      </IntlProvider>
    )
  );
  return container;
}
const submissions = (page: HTMLElement) => [...page.querySelectorAll<HTMLDetailsElement>('ol[aria-label="Submissions"] > li > details')];
const count = (text: string | null | undefined, needle: string) => (text ?? "").split(needle).length - 1;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
});

describe("CaseHistory", () => {
  it("lists submissions newest first with only the latest open and recorded counts in each summary", () => {
    const page = render();
    const [latest, earlier] = submissions(page);
    expect(latest?.querySelector("summary")?.textContent).toContain("Submission 2Latest");
    expect(latest?.open).toBe(true);
    expect(earlier?.open).toBe(false);
    expect(earlier?.querySelector("summary")?.textContent).toContain("1 answer review · 1 evidence question · 1 linked request");
    expect(latest?.querySelector("summary")?.textContent).toContain("1 answer review · no evidence questions · 1 linked request");
  });

  it("follows the loop: answer review, human evidence review, request, then the answering submission", () => {
    const page = render();
    const [latest, earlier] = submissions(page);
    const first = earlier?.textContent ?? "";
    expect(first).toContain("Answer reviewer · model proposals · no claim verification");
    expect(first).toContain("bounded-answer-reviewer · case-answer-review-v1");
    expect(first).toContain("Admitted as evidence question");
    expect(first).toContain(`${salesQuestion.question}Evidence reviewed`);
    expect(first).toContain("The purchase order names the buyer and the December delivery.");
    expect(first).toContain("reviewer-7");
    expect(first).toContain("1 evidence reference");
    expect(first).toContain("In submission 2");
    expect(first).toContain("Show the buyer's purchase order.");
    const second = latest?.textContent ?? "";
    expect(second).toContain("Responds to");
    expect(second).toContain("Carries questions from submission 1");
    expect(second).toContain("Please show the buyer's purchase order.");
    expect(second).toContain("The purchase order is attached.");
    // Carried answers stay with submission 1; the full snapshot remains available as a disclosure.
    const newMessages = latest?.querySelector('ol[aria-label="Applicant interview"]');
    expect(newMessages?.textContent).toContain("The purchase order is attached.");
    expect(newMessages?.textContent).not.toContain("When will your buyer pay?");
    expect(second).toContain("Exact submission snapshot (4 messages)");
  });

  it("does not claim a request was sent after a specific submission without a recorded link", () => {
    const page = render({
      decisionCase: { ...twoSubmissionCase, informationNeeds: [], historicalInformationNeeds: [], automaticInformationRequest: undefined },
    });
    const [latest, earlier] = submissions(page);
    expect(latest?.textContent).toContain("Not linked to an earlier submission");
    expect(earlier?.querySelector("summary")?.textContent).toContain("no linked request");
    expect(page.textContent).not.toContain("Sent after submission 1");
  });

  it("labels server authorship only for exact server-recorded messages", () => {
    const page = render();
    const [latest, earlier] = submissions(page);
    expect(earlier?.textContent).toContain("Interviewer · server-recorded");
    expect(earlier?.textContent).toContain("Server-recorded application conversation");
    expect(latest?.textContent).toContain("Interviewer · server-recorded");
    const legacy = render({ initialApplication: undefined, decisionCase: { ...twoSubmissionCase, serverClarificationDialogues: [] } });
    expect(submissions(legacy)[1]?.textContent).not.toContain("server-recorded");
  });

  it("shows each evidence question once, with no controls or review links", () => {
    const page = render();
    expect(count(page.textContent, salesQuestion.question)).toBe(1);
    expect(page.querySelectorAll("input, select, textarea, button")).toHaveLength(0);
    expect(page.querySelector('a[href="#evidence-questions"]')).toBeNull();
    expect(page.textContent).not.toContain("Include in applicant request");
    expect(page.textContent).not.toContain("Investigation");
  });

  it("separates in-progress, case-level research and unlinked records", () => {
    const page = render({ updatesStatus: "live" });
    expect(page.textContent).toContain("In progress · not submitted");
    expect(page.textContent).toContain("Uploading the invoice now.");
    expect(page.textContent).toContain("Live updates");
    const research = page.querySelector("#public-research");
    expect(research?.textContent).toContain("Case level");
    expect(research?.textContent).toContain("Public-source research");
    expect(research?.textContent).toContain("coffee export prices 2026");
    const unlinked = [...page.querySelectorAll("details")].find((item) =>
      item.querySelector(":scope > summary")?.textContent?.includes("Unlinked recorded activity")
    );
    expect(unlinked?.open).toBe(false);
    expect(unlinked?.textContent).toContain(orphanQuestion.question);
    expect(unlinked?.textContent).toContain("request-3");
    expect(submissions(page).some((round) => round.textContent?.includes(orphanQuestion.question))).toBe(false);
  });

  it("keeps the last received record visible when updates are unavailable", () => {
    const page = render({ updatesStatus: "unavailable" });
    expect(page.querySelector('[role="status"]')?.textContent).toBe("Updates unavailable · showing last received record");
    expect(page.textContent).not.toContain("Live updates");
    expect(submissions(page)).toHaveLength(2);
  });

  it("does not fabricate a conversation when none is recorded", () => {
    const page = render({ decisionCase: undefined, initialApplication: undefined });
    expect(page.textContent).toBe("No conversation recorded for this case.");
    const legacy = render({
      initialApplication: undefined,
      decisionCase: {
        submissionDigest: twoSubmissionCase.submissionDigest,
        resultDigest: twoSubmissionCase.resultDigest,
        applicantConfirmation: {
          schemaVersion: "applicant-confirmation-summary-v1",
          preparedInputId: "11111111-1111-4111-8111-111111111111",
          useOfFunds: "Harvest costs",
          acceptor: "Buyer",
          repaymentSource: "Coffee sales",
          answersAffirmed: true,
          recourseAcknowledged: true,
        },
      },
    });
    expect(legacy.textContent).toContain("Full conversation not recorded");
    expect(legacy.textContent).toContain("Harvest costs");
    expect(submissions(legacy)).toHaveLength(0);
  });
});
