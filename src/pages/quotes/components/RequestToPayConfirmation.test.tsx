import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IntlProvider } from "react-intl";
import { toast } from "@bitcredit/ui-library";
import { RequestToPayConfirmation } from "./RequestToPayConfirmation";
import { setItem } from "@/utils/local-storage";

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
  ConfirmDrawer: ({
    trigger,
    open,
    children,
    onSubmit,
    submitButtonText,
    submitButtonDisabled,
  }: {
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

function unmountLast() {
  if (root && container) {
    act(() => {
      root?.unmount();
    });
    container.remove();
    root = null;
    container = null;
  }
}

function submitDrawer(page: HTMLDivElement) {
  const submit = Array.from(page.querySelectorAll("button")).find((button) => button.textContent?.includes("Yes, request to pay"));
  expect(submit).toBeDefined();

  act(() => {
    submit?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

function getSubmittedDeadline(onSubmit: ReturnType<typeof vi.fn>): string {
  expect(onSubmit).toHaveBeenCalledTimes(1);
  return (onSubmit.mock.calls[0][0] as Date).toISOString();
}

function renderComponent(maturityDate = "2026-03-01", { open = false, billId = "bill-1" } = {}) {
  unmountLast();
  const mount = document.createElement("div");
  const onOpenChange = vi.fn();
  const onSubmit = vi.fn();
  document.body.appendChild(mount);
  const mountRoot = createRoot(mount);

  act(() => {
    mountRoot.render(
      <IntlProvider locale="en">
        <RequestToPayConfirmation
          open={open}
          onOpenChange={onOpenChange}
          onSubmit={onSubmit}
          isFetching={false}
          isPending={false}
          maturityDate={maturityDate}
          billId={billId}
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
  window.localStorage.clear();
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
    expect(button?.disabled).toBe(false);

    act(() => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
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

  it("ignores a deadline cached for a different bill", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-05T12:00:00.000Z"));

    // Opening a bill that matures far out caches its own maturity +2 days default...
    renderComponent("2026-12-01", { open: true, billId: "bill-other" });

    // ...which must not leak into a bill whose maturity has already passed.
    const { page, onSubmit } = renderComponent("2026-06-01", { open: true, billId: "bill-1" });
    submitDrawer(page);

    expect(getSubmittedDeadline(onSubmit)).toBe("2026-06-07T23:59:59.999Z");
  });

  it("re-uses the deadline cached for the same bill", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-05T12:00:00.000Z"));
    setItem("requestToPayDeadlineUtc-bill-1", "2026-12-31T23:59:59.999Z");

    const { page, onSubmit } = renderComponent("2026-06-01", { open: true, billId: "bill-1" });
    submitDrawer(page);

    expect(getSubmittedDeadline(onSubmit)).toBe("2026-12-31T23:59:59.999Z");
  });
});
