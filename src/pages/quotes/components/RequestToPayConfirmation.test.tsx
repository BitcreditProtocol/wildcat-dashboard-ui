import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IntlProvider } from "react-intl";
import { toast } from "@bitcredit/ui-library";
import { RequestToPayConfirmation } from "./RequestToPayConfirmation";

interface MockQueryOptions {
  queryKey: unknown[];
}

interface MockQueryResult {
  data?: unknown;
  isLoading?: boolean;
  error?: Error | null;
  isError?: boolean;
  refetch: () => unknown;
}

const mockUseQuery = vi.fn<(options: MockQueryOptions) => MockQueryResult>();

vi.mock("@bitcredit/ui-library", async () => {
  const actual = await vi.importActual<typeof import("@bitcredit/ui-library")>("@bitcredit/ui-library");
  return {
    ...actual,
    toast: vi.fn(() => ({
      id: "toast-id",
      dismiss: vi.fn(),
      update: vi.fn(),
    })),
  };
});

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: (options: MockQueryOptions) => mockUseQuery(options),
  };
});

vi.mock("@/generated/client/@tanstack/react-query.gen", () => ({
  getEbillOptions: ({ path }: { path: { bid: string } }) => ({
    queryKey: [{ _id: "getEbill", path }],
  }),
}));

vi.mock("@/components/Drawers", () => ({
  ConfirmDrawer: ({ trigger, open, children, onSubmit, submitButtonText, submitButtonDisabled }: {
    trigger?: ReactNode;
    open: boolean;
    children?: ReactNode;
    onSubmit: () => void;
    submitButtonText?: string;
    submitButtonDisabled?: boolean;
  }) => (
    <div>
      {trigger}
      {open && (
        <div>
          {children}
          <button type="button" disabled={submitButtonDisabled} onClick={onSubmit}>
            {submitButtonText}
          </button>
        </div>
      )}
    </div>
  ),
}));

vi.mock("./CalendarModal", () => ({
  CalendarModal: () => null,
  DatePickerButton: () => <button type="button">Payment deadline</button>,
}));

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function renderComponent(maturityDate = "2026-03-01") {
  const mount = document.createElement("div");
  const onOpenChange = vi.fn();
  const onSubmit = vi.fn();
  document.body.appendChild(mount);
  const mountRoot = createRoot(mount);

  act(() => {
    mountRoot.render(
      <IntlProvider locale="en">
        <RequestToPayConfirmation
          open={false}
          onOpenChange={onOpenChange}
          onSubmit={onSubmit}
          isFetching={false}
          isPending={false}
          maturityDate={maturityDate}
          billId="bill-1"
        />
      </IntlProvider>
    );
  });

  root = mountRoot;
  container = mount;

  return { page: mount, onOpenChange, onSubmit };
}

beforeEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  mockUseQuery.mockReturnValue({
    data: { id: "bill-1" },
    isLoading: false,
    error: null,
    isError: false,
    refetch: vi.fn(),
  });
});

afterEach(() => {
  if (root && container) {
    act(() => {
      root?.unmount();
    });
    container.remove();
    root = null;
    container = null;
  }
  vi.useRealTimers();
});

describe("RequestToPayConfirmation", () => {
  it("keeps request to pay inactive before the UTC start of maturity date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-28T23:59:59.999Z"));

    const { page, onOpenChange } = renderComponent();
    const button = page.querySelector("button");
    expect(button).not.toBeNull();
    expect(button?.getAttribute("aria-disabled")).toBe("true");
    expect(button?.disabled).toBe(true);

    act(() => {
      button?.parentElement?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith({
      title: "Request to pay is available on the maturity date (2026-03-01).",
      variant: "info",
    });
  });

  it("allows request to pay at the UTC start of maturity date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T00:00:00.000Z"));

    const { page, onOpenChange } = renderComponent();
    const button = page.querySelector("button");
    expect(button).not.toBeNull();
    expect(button?.disabled).toBe(false);

    act(() => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(toast).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});
