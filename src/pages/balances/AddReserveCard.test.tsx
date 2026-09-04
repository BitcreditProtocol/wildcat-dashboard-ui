import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AddReserveCard } from "./AddReserveCard";

const mockMutate = vi.fn();

vi.mock("@/generated/client/@tanstack/react-query.gen", () => ({
  postAddReserveMutation: () => ({
    mutationFn: () => Promise.resolve(undefined),
  }),
  getAddReserveStatusOptions: () => ({
    queryKey: [{ _id: "addReserveStatus" }],
    queryFn: () => Promise.resolve(undefined),
  }),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useMutation: () => ({ mutate: mockMutate, reset: vi.fn(), isPending: false, error: null, data: undefined }),
    useQuery: () => ({ data: undefined, error: null }),
  };
});

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function renderCard(element: ReactElement): HTMLDivElement {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const mountRoot = createRoot(mount);
  act(() => {
    mountRoot.render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <IntlProvider locale="en-US">{element}</IntlProvider>
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

describe("AddReserveCard amount field", () => {
  it("keeps only positive integers in the amount field", () => {
    const page = renderCard(<AddReserveCard />);
    const input = page.querySelector("input")!;

    expect(input.getAttribute("type")).toBe("text");
    expect(input.inputMode).toBe("numeric");

    for (const [typed, expected] of [
      ["-5", "5"],
      ["1.5", "15"],
      ["1e5", "15"],
      ["0", ""],
      ["007", "7"],
      ["abc", ""],
      ["1 000", "1000"],
      ["12", "12"],
    ] as const) {
      typeInto(input, typed);
      expect(input.value, `typing "${typed}"`).toBe(expected);
    }
  });

  it("does not submit when the amount is empty", () => {
    const page = renderCard(<AddReserveCard />);
    const form = page.querySelector("form")!;
    const input = page.querySelector("input")!;

    typeInto(input, "-0");
    act(() => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("submits the parsed integer amount", () => {
    const page = renderCard(<AddReserveCard />);
    const form = page.querySelector("form")!;
    const input = page.querySelector("input")!;

    typeInto(input, "2100");
    act(() => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(mockMutate).toHaveBeenCalledTimes(1);
    const body = (mockMutate.mock.calls[0][0] as { body: { amount: number } }).body;
    expect(body.amount).toBe(2100);
  });
});
