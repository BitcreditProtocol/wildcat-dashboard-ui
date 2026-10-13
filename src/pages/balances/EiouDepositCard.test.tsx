import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PreferencesProvider } from "@/context/preferences/PreferencesContext";
import type { EiouDepositResponse } from "@/generated/client/types.gen";
import { EiouDepositCard } from "./EiouDepositCard";

const mockMutate = vi.fn();
interface MockMutation {
  mutate: typeof mockMutate;
  reset: () => void;
  isPending: boolean;
  error: unknown;
  data?: EiouDepositResponse;
}

interface MockStatusQuery {
  data?: EiouDepositResponse;
  error: unknown;
}

const mockMutation = vi.fn<() => MockMutation>(() => ({ mutate: mockMutate, reset: vi.fn(), isPending: false, error: null }));
const mockStatusQuery = vi.fn<() => MockStatusQuery>(() => ({ error: null }));

vi.mock("@/generated/client/@tanstack/react-query.gen", () => ({
  postEiouDepositMutation: () => ({
    mutationFn: () => Promise.resolve(undefined),
  }),
  getEiouDepositStatusOptions: () => ({
    queryKey: [{ _id: "eiouDepositStatus" }],
    queryFn: () => Promise.resolve(undefined),
  }),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useMutation: () => mockMutation(),
    useQuery: () => mockStatusQuery(),
  };
});

vi.mock("@/components/QRCodeWithErrorBoundary", () => ({
  QRCodeModal: () => null,
}));

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function renderCard(element: ReactElement): HTMLDivElement {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const mountRoot = createRoot(mount);
  act(() => {
    mountRoot.render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <IntlProvider locale="en-US">
          <PreferencesProvider>{element}</PreferencesProvider>
        </IntlProvider>
      </QueryClientProvider>
    );
  });
  root = mountRoot;
  container = mount;
  return mount;
}

const valueDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");

function typeInto(input: HTMLInputElement, value: string) {
  act(() => {
    valueDescriptor?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function deposit(status: EiouDepositResponse["status"]): EiouDepositResponse {
  return { request_id: "req-1", address: "bc1qdepositaddress", amount: 42, status };
}

afterEach(() => {
  vi.clearAllMocks();
  if (root && container) {
    act(() => {
      root?.unmount();
    });
    container.remove();
    root = null;
    container = null;
  }
});

describe("EiouDepositCard", () => {
  it("keeps only positive whole token counts in the amount field", () => {
    const page = renderCard(<EiouDepositCard />);
    const input = page.querySelector("input")!;

    for (const [typed, expected] of [
      ["-5", "5"],
      ["1.5", "15"],
      ["0", ""],
      ["007", "7"],
      ["abc", ""],
    ] as const) {
      typeInto(input, typed);
      expect(input.value, `typing "${typed}"`).toBe(expected);
    }
  });

  it("does not submit when the amount is empty", () => {
    const page = renderCard(<EiouDepositCard />);

    typeInto(page.querySelector("input")!, "0");
    act(() => {
      page.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("submits the token count with a fresh request id", () => {
    const page = renderCard(<EiouDepositCard />);

    typeInto(page.querySelector("input")!, "250");
    act(() => {
      page.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(mockMutate).toHaveBeenCalledTimes(1);
    const body = (mockMutate.mock.calls[0][0] as { body: { request_id: string; amount: number } }).body;
    expect(body.amount).toBe(250);
    expect(body.request_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("waits on a pending deposit", () => {
    mockStatusQuery.mockReturnValue({ data: deposit("Pending"), error: null });

    const page = renderCard(<EiouDepositCard />);

    expect(page.textContent).toContain("Waiting for the e-IOU deposit to arrive...");
    expect(page.querySelector("form")).toBeNull();
  });

  it("shows the block a completed deposit was credited at", () => {
    mockStatusQuery.mockReturnValue({ data: deposit({ Completed: { block_height: 871_234 } }), error: null });

    const page = renderCard(<EiouDepositCard />);

    expect(page.textContent).toContain("Credited (seen at block 871234)");
    expect(page.textContent).not.toContain("Waiting");
  });

  it("reports a failed request", () => {
    mockMutation.mockReturnValue({ mutate: mockMutate, reset: vi.fn(), isPending: false, error: new Error("boom") });

    const page = renderCard(<EiouDepositCard />);

    expect(page.textContent).toContain("Failed to deposit e-IOU");
  });
});
