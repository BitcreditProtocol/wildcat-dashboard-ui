import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CaseWorkspace } from "./CaseWorkspace";

let root: Root | undefined;
function Draft() {
  const [count, setCount] = useState(0);
  return (
    <button type="button" onClick={() => setCount(count + 1)}>
      Draft {count}
    </button>
  );
}
function render(reviewCount?: number) {
  const page = document.createElement("div");
  document.body.append(page);
  root = createRoot(page);
  act(() => {
    root?.render(
      <IntlProvider locale="en">
        <CaseWorkspace
          reviewCount={reviewCount}
          review={
            <section id="documents-and-evidence">
              <Draft />
            </section>
          }
          history={
            <>
              <section id="case-conversation">Recorded messages</section>
              <section id="case-investigation">Actual investigator results</section>
            </>
          }
          calculation={<section id="full-governed-assessment">Policy checks</section>}
          record={<section id="bill-record">Bill history</section>}
        />
      </IntlProvider>
    );
  });
  return page;
}
function tab(page: HTMLElement, label: string) {
  const found = Array.from(page.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find((item) => item.textContent === label);
  if (found === undefined) throw new Error(`Missing tab ${label}`);
  return found;
}
function select(button: HTMLButtonElement) {
  act(() => {
    button.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
  });
}
afterEach(() => {
  act(() => root?.unmount());
  document.body.replaceChildren();
  window.history.replaceState(null, "", window.location.pathname);
  vi.restoreAllMocks();
});
describe("case workspace", () => {
  it("offers exactly the review, history, calculation and bill-record tabs", () => {
    const page = render();
    expect(Array.from(page.querySelectorAll('[role="tab"]')).map((item) => item.textContent)).toEqual([
      "Review",
      "Case history",
      "Calculation",
      "Bill record",
    ]);
  });
  it("counts outstanding review work on the Review tab only when there is any", () => {
    const page = render(3);
    const review = Array.from(page.querySelectorAll('[role="tab"]'))[0];
    expect(review?.textContent).toBe("Review3");
    expect(review?.querySelector('[aria-label="3 items to review"]')).not.toBeNull();
    act(() => root?.unmount());
    document.body.replaceChildren();
    expect(render(0).querySelector('[role="tab"]')?.textContent).toBe("Review");
  });
  it("reopens an already-current fragment after the operator changed tabs", () => {
    window.history.replaceState(null, "", "#documents-and-evidence");
    const page = render();
    select(tab(page, "Case history"));
    const link = document.createElement("a");
    link.href = "#documents-and-evidence";
    document.body.append(link);
    window.addEventListener("click", (event) => event.preventDefault(), { once: true });
    act(() => {
      link.click();
    });
    expect(tab(page, "Review").getAttribute("aria-selected")).toBe("true");
  });
  it("starts on review, hides inactive panels and keeps drafts mounted", () => {
    const page = render();
    expect(tab(page, "Review").getAttribute("aria-selected")).toBe("true");
    expect(page.querySelectorAll('[role="tabpanel"][hidden]')).toHaveLength(3);
    const draft = page.querySelector<HTMLButtonElement>("#documents-and-evidence button");
    act(() => draft?.click());
    select(tab(page, "Case history"));
    expect(page.querySelector("#documents-and-evidence")?.closest('[role="tabpanel"]')?.hasAttribute("hidden")).toBe(true);
    select(tab(page, "Review"));
    expect(page.querySelector("#documents-and-evidence button")).toBe(draft);
    expect(draft?.textContent).toBe("Draft 1");
  });
  it.each([
    ["#documents-and-evidence", "Review"],
    ["#evidence-questions", "Review"],
    ["#proposed-follow-ups", "Review"],
    ["#case-conversation", "Case history"],
    ["#case-investigation", "Case history"],
    ["#case-history", "Case history"],
    ["#full-governed-assessment", "Calculation"],
    ["#bill-record", "Bill record"],
  ])("opens %s in the %s tab", (hash, label) => {
    window.history.replaceState(null, "", hash);
    const page = render();
    expect(tab(page, label).getAttribute("aria-selected")).toBe("true");
  });
  it("opens the tab requested by a direct link and follows later hash navigation", async () => {
    window.history.replaceState(null, "", "#case-conversation");
    const page = render();
    expect(tab(page, "Case history").getAttribute("aria-selected")).toBe("true");
    act(() => {
      window.history.replaceState(null, "", "#full-governed-assessment");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(tab(page, "Calculation").getAttribute("aria-selected")).toBe("true");
    const scroll = vi.fn();
    const question = document.createElement("section");
    question.id = "evidence-questions";
    question.scrollIntoView = scroll;
    page.querySelector("#documents-and-evidence")?.append(question);
    act(() => {
      window.history.replaceState(null, "", "#evidence-questions");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
    expect(scroll).toHaveBeenCalled();
    expect(tab(page, "Review").getAttribute("aria-selected")).toBe("true");
    expect(question.closest('[role="tabpanel"]')?.hasAttribute("hidden")).toBe(false);
  });
  it("supports keyboard selection through the shared accessible tab primitive", async () => {
    const page = render();
    await act(async () => {
      tab(page, "Review").focus();
      tab(page, "Review").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(document.activeElement).toBe(tab(page, "Case history"));
    expect(tab(page, "Case history").getAttribute("aria-selected")).toBe("true");
  });
});
