import { fireEvent, getByRole, getByTestId } from "@testing-library/dom";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { directoryFixture, otherApplicationId } from "@/pages/mint-checks/mint-check-test-fixtures";
import { cleanup, flush, json, renderWithProviders, requestBody } from "@/pages/mint-checks/mint-check-test-render";
import DirectoryPage from "./DirectoryPage";

vi.mock("@/lib/api-client", () => ({ authenticatedFetch: (path: string, init?: RequestInit) => fetch(path, init) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("DirectoryPage", () => {
  it("searches the deep-linked query and shows participants and possible duplicates", async () => {
    const request = vi.fn((_path: string, init?: RequestInit) => {
      const { query } = requestBody(init) as { query: string };
      return Promise.resolve(json(directoryFixture(query)));
    });
    vi.stubGlobal("fetch", request);
    const { page } = await renderWithProviders(<DirectoryPage />, "/directory?q=Finca%20Verde");
    expect(request.mock.calls[0]?.[0]).toBe("/api/ai-credit/participant-directory");
    expect(requestBody(request.mock.calls[0]?.[1])).toEqual({ query: "Finca Verde" });
    expect(page.querySelector("input")?.value).toBe("Finca Verde");
    expect(page.textContent).toContain("Optional public listings are copied from observed relays");
    expect(page.textContent).toContain("Results for “Finca Verde”");
    expect(page.textContent).toContain("90% match");
    expect(page.textContent).toContain("Also named: Verde Finca S.A.");
    expect(page.textContent).toContain("Calle 1, Antigua, Guatemala");
    expect(page.textContent).toContain("Registration: FN-2020/17");
    expect(page.textContent).toContain("A missing match here proves nothing.");
    expect(getByRole(page, "link", { name: /Onboarding application MOB-22222222/u }).getAttribute("href")).toBe(
      `/facilities?application=${otherApplicationId}`
    );
    expect(page.textContent).toContain("Possible duplicates");
    expect(page.textContent).toContain("Review signal — not a finding");
    expect(getByRole(page, "link", { name: "Look up Finca Verde S.A. in the directory" }).getAttribute("href")).toBe(
      "/directory?q=Finca+Verde+S.A."
    );
    expect(getByTestId(page, "route-location").textContent).toBe("/directory?q=Finca%20Verde");
  });

  it("follows a duplicate's link to a new search and fills the box with it", async () => {
    const request = vi.fn((_path: string, init?: RequestInit) => {
      const { query } = requestBody(init) as { query: string };
      return Promise.resolve(json(directoryFixture(query)));
    });
    vi.stubGlobal("fetch", request);
    const { page } = await renderWithProviders(<DirectoryPage />, "/directory");
    expect(requestBody(request.mock.calls[0]?.[1])).toEqual({ query: "" });
    expect(page.textContent).toContain("Participants");
    act(() => {
      fireEvent.click(getByRole(page, "link", { name: "Look up Finca Verde S.A. in the directory" }));
    });
    await flush();
    expect(page.querySelector("input")?.value).toBe("Finca Verde S.A.");
    expect(requestBody(request.mock.calls[request.mock.calls.length - 1]?.[1])).toEqual({ query: "Finca Verde S.A." });
  });
});
