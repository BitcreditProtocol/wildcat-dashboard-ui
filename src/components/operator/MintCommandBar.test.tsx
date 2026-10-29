import { act } from "react";
import { fireEvent, getByRole, queryByRole } from "@testing-library/dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MintCommandBar } from "./MintCommandBar";
import { cleanup, renderWithProviders } from "@/pages/mint-checks/mint-check-test-render";
vi.mock("@/pages/intelligence/AskTheMint", () => ({ AskTheMint: () => <p>Existing Mint discussion</p> }));
afterEach(cleanup);
describe("persistent Mint commands", () => {
  it("opens the existing Mint chat with slash and keeps keyboard focus inside the drawer", async () => {
    const { page } = await renderWithProviders(<MintCommandBar />);
    await act(() => fireEvent.keyDown(window, { key: "/" }));
    const dialog = getByRole(document.body, "dialog");
    expect(dialog.textContent).toContain("Existing Mint discussion");
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(page).not.toContainElement(dialog);
  });
  it("leaves slash available while typing", async () => {
    const { page } = await renderWithProviders(
      <>
        <MintCommandBar />
        <input aria-label="Draft" />
      </>
    );
    await act(() => fireEvent.keyDown(getByRole(page, "textbox", { name: "Draft" }), { key: "/" }));
    expect(queryByRole(document.body, "dialog")).toBeNull();
  });
  it("routes Cmd/Ctrl K to the case discussion instead of the global Mint context", async () => {
    const open = vi.fn((event: Event) => event.preventDefault());
    window.addEventListener("mint-ask-case", open);
    try {
      await renderWithProviders(<MintCommandBar />, "/quotes/97e45adf-fc86-4b30-9322-afae434c3287");
      await act(() => fireEvent.keyDown(window, { key: "k", ctrlKey: true }));
      await act(() => fireEvent.keyDown(window, { key: "k", metaKey: true }));
      expect(open).toHaveBeenCalledTimes(2);
      expect(queryByRole(document.body, "dialog")).toBeNull();
    } finally {
      window.removeEventListener("mint-ask-case", open);
    }
  });
});
