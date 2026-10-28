import { mintIntelligenceCommandSchema, type MintIntelligenceCommand } from "@bitcredit/ai-credit-shared";
import { fireEvent, getAllByRole, getByLabelText, getByRole } from "@testing-library/dom";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { intelligenceFixture, intelligenceNote } from "@/pages/mint-checks/mint-check-test-fixtures";
import { cleanup, flush, json, renderWithProviders, requestBody } from "@/pages/mint-checks/mint-check-test-render";
import IntelligencePage from "./IntelligencePage";
import { intelligenceReviewOverdue, supersededChain } from "./intelligence-copy";

vi.mock("@/lib/api-client", () => ({ authenticatedFetch: (path: string, init?: RequestInit) => fetch(path, init) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubIntelligence() {
  const commands: MintIntelligenceCommand[] = [];
  const response = intelligenceFixture();
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string, init?: RequestInit) => {
      if (path !== "/api/ai-credit/mint-intelligence") return Promise.resolve(new Response(null, { status: 404 }));
      if (init?.method === "POST") {
        const command = mintIntelligenceCommandSchema.parse(requestBody(init));
        commands.push(command);
        const { scope, subject, title, body, sources, reviewBy, supersedes } = command;
        const note = intelligenceNote({
          ...{ scope, subject, title, body, sources, reviewBy, supersedes },
          id: "99999999-9999-4999-8999-999999999999",
          authoredAt: "2026-10-27T10:00:00.000Z",
        });
        response.notes.unshift(note);
        response.current = [note.id, ...response.current.filter((id) => id !== command.supersedes)];
      }
      return Promise.resolve(json(response));
    })
  );
  return commands;
}

function type(element: HTMLElement, value: string) {
  act(() => {
    fireEvent.input(element, { target: { value } });
  });
}

describe("IntelligencePage", () => {
  it("groups current notes by region, industry and macro with history collapsed", async () => {
    stubIntelligence();
    const { page } = await renderWithProviders(<IntelligencePage />, "/intelligence");
    expect(page.textContent).toContain("Context for people. Not used by pricing, gates or the AI interview.");
    const region = getByRole(page, "region", { name: "Region" });
    expect(region.textContent).toContain("Harvest season shifts");
    expect(region.textContent).toContain("Port strike");
    expect(region.textContent).toContain("1 earlier version");
    expect(region.querySelector("details")?.open).toBe(false);
    expect(getByRole(page, "region", { name: "Industry" }).textContent).toContain("Prices fell this quarter");
    expect(getByRole(page, "region", { name: "Macro" }).textContent).toContain("Policy rate unchanged");
    for (const source of getAllByRole(page, "link", { name: "Anacafé report" })) {
      expect(source.getAttribute("rel")).toBe("noopener noreferrer");
      expect(source.getAttribute("target")).toBe("_blank");
    }
    expect(getByRole(page, "region", { name: "Industry" }).textContent).toContain("Review overdue");
    expect(getByRole(page, "region", { name: "Macro" }).textContent).not.toContain("Review overdue");
  });

  it("adds a note with a fresh command id and shows the stored result", async () => {
    const commands = stubIntelligence();
    const { page } = await renderWithProviders(<IntelligencePage />, "/intelligence");
    act(() => {
      fireEvent.click(getByRole(page, "button", { name: "Add note" }));
    });
    act(() => {
      fireEvent.change(getByLabelText(page, "Scope"), { target: { value: "macro" } });
    });
    type(getByLabelText(page, "Subject"), "Inflation");
    type(getByLabelText(page, "Title"), "Inflation eased");
    type(getByLabelText(page, "Note"), "Consumer prices rose less than expected.");
    act(() => {
      fireEvent.click(getByRole(page, "button", { name: "Add source" }));
    });
    type(getByLabelText(page, "Source 1"), "Statistics office");
    type(getByLabelText(page, "Link 1 (optional)"), "https://example.test/cpi");
    act(() => {
      fireEvent.click(getByRole(page, "button", { name: "Save note" }));
    });
    await flush();
    expect(commands).toEqual([
      expect.objectContaining({
        action: "add_note",
        scope: "macro",
        subject: "Inflation",
        sources: [{ label: "Statistics office", url: "https://example.test/cpi" }],
        reviewBy: null,
        supersedes: null,
      }),
    ]);
    expect(() => getByLabelText(page, "Title")).toThrow();
    expect(getByRole(page, "region", { name: "Macro" }).textContent).toContain("Inflation eased");
  });

  it("updates a note by superseding it, keeping scope and subject", async () => {
    const commands = stubIntelligence();
    const { page } = await renderWithProviders(<IntelligencePage />, "/intelligence");
    const region = getByRole(page, "region", { name: "Region" });
    const guatemala = Array.from(region.querySelectorAll("li")).find((item) => item.textContent?.includes("Harvest season shifts"));
    act(() => {
      fireEvent.click(getByRole(guatemala ?? region, "button", { name: "Update" }));
    });
    expect(getByLabelText(page, "Scope")).toBeDisabled();
    expect(getByLabelText(page, "Subject")).toHaveValue("Guatemala");
    type(getByLabelText(page, "Title"), "Harvest starts later");
    act(() => {
      fireEvent.click(getByRole(page, "button", { name: "Save note" }));
    });
    await flush();
    expect(commands[0]).toMatchObject({ scope: "region", subject: "Guatemala", supersedes: "33333333-3333-4333-8333-333333333333" });
    const updated = getByRole(page, "region", { name: "Region" });
    expect(updated.textContent).toContain("Harvest starts later");
    // The superseded note joins its own predecessor as history.
    expect(updated.textContent).toContain("2 earlier versions");
  });

  it("does not send an invalid note", async () => {
    const commands = stubIntelligence();
    const { page } = await renderWithProviders(<IntelligencePage />, "/intelligence");
    act(() => {
      fireEvent.click(getByRole(page, "button", { name: "Add note" }));
    });
    type(getByLabelText(page, "Subject"), "GT");
    type(getByLabelText(page, "Title"), "Short");
    type(getByLabelText(page, "Note"), "Too short");
    act(() => {
      fireEvent.click(getByRole(page, "button", { name: "Save note" }));
    });
    await flush();
    expect(commands).toHaveLength(0);
    expect(getByRole(page, "alert").textContent).toContain("Some fields are not valid");
  });

  it("explains when intelligence storage is not configured", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    const { page } = await renderWithProviders(<IntelligencePage />, "/intelligence");
    expect(getByRole(page, "alert").textContent).toContain("The Mint cannot serve this data right now.");
    expect(page.textContent).not.toContain("Add note");
  });
});

describe("intelligence helpers", () => {
  it("follows supersedes links and flags only past review dates", () => {
    const response = intelligenceFixture();
    const current = response.notes.find((note) => note.title === "Harvest season shifts");
    expect(current && supersededChain(current, response.notes).map((note) => note.title)).toEqual(["Harvest season"]);
    expect(intelligenceReviewOverdue({ reviewBy: "2026-10-26" }, "2026-10-27")).toBe(true);
    expect(intelligenceReviewOverdue({ reviewBy: "2026-10-27" }, "2026-10-27")).toBe(false);
    expect(intelligenceReviewOverdue({ reviewBy: null }, "2026-10-27")).toBe(false);
  });
});
