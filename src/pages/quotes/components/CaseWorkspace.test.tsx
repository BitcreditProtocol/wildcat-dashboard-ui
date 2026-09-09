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
function render() {
  const page = document.createElement("div");
  document.body.append(page);
  root = createRoot(page);
  act(() => {
    root?.render(
      <IntlProvider locale="en">
        <CaseWorkspace
          evidence={
            <section id="documents-and-evidence">
              <Draft />
            </section>
          }
          conversation={<section id="case-conversation">Recorded messages</section>}
          investigation={<section id="case-investigation">Actual investigator results</section>}
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
  it("reopens an already-current fragment after the operator changed tabs", () => {
    window.history.replaceState(null, "", "#documents-and-evidence");
    const page = render();
    select(tab(page, "Conversation"));
    const link = document.createElement("a");
    link.href = "#documents-and-evidence";
    document.body.append(link);
    window.addEventListener("click", (event) => event.preventDefault(), { once: true });
    act(() => {
      link.click();
    });
    expect(tab(page, "Evidence").getAttribute("aria-selected")).toBe("true");
  });
  it("starts on evidence, hides inactive panels and keeps drafts mounted", () => {
    const page = render();
    expect(tab(page, "Evidence").getAttribute("aria-selected")).toBe("true");
    expect(page.querySelectorAll('[role="tabpanel"][hidden]')).toHaveLength(4);
    const draft = page.querySelector<HTMLButtonElement>("#documents-and-evidence button");
    act(() => draft?.click());
    select(tab(page, "Conversation"));
    expect(page.querySelector("#documents-and-evidence")?.closest('[role="tabpanel"]')?.hasAttribute("hidden")).toBe(true);
    select(tab(page, "Evidence"));
    expect(page.querySelector("#documents-and-evidence button")).toBe(draft);
    expect(draft?.textContent).toBe("Draft 1");
  });
  it("opens the tab requested by a direct link and follows later hash navigation", async () => {
    window.history.replaceState(null, "", "#case-conversation");
    const page = render();
    expect(tab(page, "Conversation").getAttribute("aria-selected")).toBe("true");
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
    expect(tab(page, "Evidence").getAttribute("aria-selected")).toBe("true");
    expect(question.closest('[role="tabpanel"]')?.hasAttribute("hidden")).toBe(false);
  });
  it("supports keyboard selection through the shared accessible tab primitive", async () => {
    const page = render();
    await act(async () => {
      tab(page, "Evidence").focus();
      tab(page, "Evidence").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(document.activeElement).toBe(tab(page, "Conversation"));
    expect(tab(page, "Conversation").getAttribute("aria-selected")).toBe("true");
  });
});
