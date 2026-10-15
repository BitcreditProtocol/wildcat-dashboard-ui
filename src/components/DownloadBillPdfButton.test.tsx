import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DownloadBillPdfButton } from "./DownloadBillPdfButton";

const createBillPdf = vi.hoisted(() => vi.fn(() => Promise.resolve(new Uint8Array([0x25, 0x50, 0x44, 0x46]))));
const fetchBill = vi.hoisted(() => vi.fn<(billId: string) => Promise<{ id: string }>>());
const toast = vi.hoisted(() => vi.fn());

vi.mock("@bitcredit/ui-library/bill-pdf", () => ({ createBillPdf }));
vi.mock("@/lib/bill-pdf", () => ({
  billPdfContentFromBill: (bill: { id: string }) => ({ billId: bill.id }),
  billPdfEndorsementsFromHistory: (blocks: unknown[]) => blocks.map((_, index) => ({ row: index })),
}));
vi.mock("@/generated/client/@tanstack/react-query.gen", () => ({
  getEbillOptions: ({ path }: { path: { bid: string } }) => ({ queryKey: ["ebill", path.bid], queryFn: () => fetchBill(path.bid) }),
  getEbillHistoryOptions: ({ path }: { path: { bid: string } }) => ({ queryKey: ["history", path.bid], queryFn: () => [{}, {}] }),
}));
vi.mock("@bitcredit/ui-library", async () => ({
  ...(await vi.importActual<typeof import("@bitcredit/ui-library")>("@bitcredit/ui-library")),
  toast,
}));

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const clicks: string[] = [];

function render(billId: string | undefined) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <IntlProvider locale="en-US">
          <DownloadBillPdfButton billId={billId} />
        </IntlProvider>
      </QueryClientProvider>
    );
  });
  return container;
}

async function clickPrint(page: HTMLElement) {
  await act(async () => {
    page.querySelector("button")?.click();
    for (let i = 0; i < 5; i++) await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  clicks.length = 0;
  vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:bill"), revokeObjectURL: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    clicks.push(this.download);
  });
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("DownloadBillPdfButton", () => {
  it("renders nothing without a bill", () => {
    expect(render(undefined).querySelector("button")).toBeNull();
  });

  it("prints the bill with its endorsements and downloads it under the bill's id", async () => {
    fetchBill.mockResolvedValue({ id: "bill-42" });
    const page = render("bill-42");

    expect(page.textContent).toContain("Print bill");
    await clickPrint(page);

    expect(createBillPdf).toHaveBeenCalledWith({ billId: "bill-42" }, [{ row: 0 }, { row: 1 }]);
    expect(clicks).toEqual(["bill-bill-42.pdf"]);
  });

  it("says so when the bill cannot be loaded", async () => {
    fetchBill.mockRejectedValue(new Error("bill not found"));
    const page = render("missing");

    await clickPrint(page);

    expect(createBillPdf).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "The bill could not be printed", variant: "error" }));
  });
});
