import { act } from "react";
import { fireEvent, getByRole } from "@testing-library/dom";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it } from "vitest";
import { ApplicantText, ApplicantTextProvider } from "./ApplicantText";
import { operatorTextFromResponse, withoutOperatorText } from "./operator-text";
import { cleanup, renderWithProviders } from "@/pages/mint-checks/mint-check-test-render";
import { parseDecisionCasesResponse } from "@/pages/credit/parse-decision-cases";
const original = "financiar la cosecha de café";
const translated = {
  status: "translated",
  sameLanguage: false,
  text: "finance the coffee harvest",
  sourceLanguage: "es",
  promptVersion: "operator-text-translation-v1",
  model: "synthetic-route",
  createdAt: "2026-10-29T10:00:00Z",
};
const response = (renderings: Record<string, unknown>) => ({
  operatorText: {
    schemaVersion: "operator-text-v1",
    languages: ["en", "es"],
    records: [{ ref: "sha256:" + "a".repeat(64), original, operatorRenderings: renderings }],
  },
});
afterEach(cleanup);
describe("display-only applicant renderings", () => {
  it("uses the UI base language, labels model text and reveals the exact original in one click", async () => {
    const records = operatorTextFromResponse(response({ en: translated, es: { status: "same_language", sameLanguage: true } }));
    const { page } = await renderWithProviders(
      <IntlProvider locale="en-GB">
        <ApplicantTextProvider records={records}>
          <ApplicantText>{original}</ApplicantText>
        </ApplicantTextProvider>
      </IntlProvider>
    );
    expect(page.textContent).toContain("finance the coffee harvest");
    expect(page.textContent).toContain("Model translation");
    expect(page.querySelector("[title]")?.getAttribute("title")).toContain("Spanish (model)");
    await act(() => fireEvent.click(getByRole(page, "button", { name: "Original" })));
    expect(page.textContent).toContain(original);
    expect(page.textContent).not.toContain("finance the coffee harvest");
    await act(() => fireEvent.click(getByRole(page, "button", { name: "Translation" })));
    expect(page.textContent).toContain("finance the coffee harvest");
  });
  it.each(["pending", "failed", "same_language", "missing"])("keeps the original for %s without a translation label", async (status) => {
    const records = operatorTextFromResponse(
      response(status === "missing" ? {} : { en: { status, sameLanguage: status === "same_language" } })
    );
    const { page } = await renderWithProviders(
      <ApplicantTextProvider records={records}>
        <ApplicantText>{original}</ApplicantText>
      </ApplicantTextProvider>
    );
    expect(page.textContent).toContain(original);
    expect(page.textContent).not.toContain("Model translation");
    expect(page.textContent?.includes("Translating…")).toBe(status === "pending");
  });
  it("isolates only the additive text field while unknown governed fields still fail closed", () => {
    const payload = { schemaVersion: "ai-credit-workbench-decisions-v1", cases: [], issues: [], ...response({ en: translated }) };
    const parsed = parseDecisionCasesResponse(payload);
    expect(parsed.cases).toEqual([]);
    expect(parsed.operatorText?.get(original)?.en.text).toBe(translated.text);
    expect(() => parseDecisionCasesResponse({ ...payload, unexpectedAuthority: true })).toThrow();
    expect(withoutOperatorText({ ...payload, unexpectedAuthority: true })).toHaveProperty("unexpectedAuthority", true);
    expect(operatorTextFromResponse(response({ en: { ...translated, text: 42 } })).get(original)?.en).toBeUndefined();
  });
});
