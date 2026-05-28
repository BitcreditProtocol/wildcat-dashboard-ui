import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntlProvider } from "react-intl";
import { MemoryRouter } from "react-router";
import type { DeniedMeltOp } from "@/generated/client/types.gen";

interface QueryOptions {
  queryKey: { _id: string }[];
}
interface QueryResult {
  data: unknown;
  isLoading: boolean;
  isFetching?: boolean;
  isError?: boolean;
  error: Error | null;
  refetch?: () => Promise<unknown>;
}

const { mockDeleteHookReturn } = vi.hoisted(() => {
  const obj = {
    deleteTarget: null as DeniedMeltOp | null,
    setDeleteTarget: vi.fn<(op: DeniedMeltOp) => void>(),
    confirmDelete: vi.fn(),
    closeDeleteConfirmation: vi.fn(),
    deletingId: undefined as string | undefined,
    isDeleting: false,
  };
  return { mockDeleteHookReturn: obj };
});

let nextSearchQuery = "";
const mockUseQuery = vi.fn<(options: QueryOptions) => QueryResult>();

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: (options: QueryOptions) => mockUseQuery(options),
  };
});

vi.mock("@/generated/client/@tanstack/react-query.gen", () => ({
  listDeniedMeltopsOptions: () => ({ queryKey: [{ _id: "listDeniedMeltops" }] }),
}));

vi.mock("./useDeleteDeniedMeltRequest", () => ({
  useDeleteDeniedMeltRequest: () => mockDeleteHookReturn,
}));

vi.mock("@/components/Currency", () => ({
  Currency: ({ value }: { value: number }) => <span>{value} sat</span>,
}));

vi.mock("@/components/Drawers", () => ({
  ConfirmDrawer: ({
    open,
    onSubmit,
    submitButtonText,
    children,
  }: {
    open: boolean;
    onSubmit: () => void;
    submitButtonText?: string;
    children?: ReactElement | ReactElement[] | null;
  }) =>
    open ? (
      <div data-drawer="confirm">
        {children}
        <button type="button" data-action="confirm-submit" onClick={onSubmit}>
          {submitButtonText ?? "Confirm"}
        </button>
      </div>
    ) : null,
}));

vi.mock("@bitcredit/ui-library", async () => {
  const actual = await vi.importActual<typeof import("@bitcredit/ui-library")>("@bitcredit/ui-library");
  const React = await vi.importActual<typeof import("react")>("react");
  const SelectContext = React.createContext<(value: string) => void>(vi.fn());

  return {
    ...actual,
    Search: ({ onChange, onSearch }: { onChange?: (v: string) => void; onSearch: (v: string) => void }) => (
      <button
        type="button"
        onClick={() => {
          onChange?.(nextSearchQuery);
          onSearch(nextSearchQuery);
        }}
      >
        SearchMock
      </button>
    ),
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value: string;
      onValueChange: (value: string) => void;
      children: ReactElement | ReactElement[];
    }) => (
      <SelectContext.Provider value={onValueChange}>
        <div data-select-value={value}>{children}</div>
      </SelectContext.Provider>
    ),
    SelectTrigger: ({ children }: { children: ReactElement | string }) => <div>{children}</div>,
    SelectValue: () => <span>SelectValue</span>,
    SelectContent: ({ children }: { children: ReactElement | ReactElement[] }) => <div>{children}</div>,
    SelectItem: ({ value, children }: { value: string; children: ReactElement | string | number }) => {
      const onValueChange = React.useContext(SelectContext);
      return (
        <button type="button" data-select-item={value} onClick={() => onValueChange(value)}>
          {children}
        </button>
      );
    },
    TruncatedTextPopover: ({ text }: { text: string }) => <span>{text}</span>,
  };
});

vi.mock("@/components/SortButtons", () => ({
  SortButtons: ({ options, onSortChange }: { options: { field: string; label: string }[]; onSortChange: (field: string) => void }) => (
    <div>
      {options.map((option) => (
        <button key={option.field} type="button" onClick={() => onSortChange(option.field)}>
          {`sort-${option.field}`}
        </button>
      ))}
    </div>
  ),
}));

import MeltRequestsPage from "./MeltRequestsPage";

const TODAY = "2026-02-20T08:00:00.000Z";
const LAST_WEEK = "2026-02-16T10:00:00.000Z";
const OLD = "2026-02-01T10:00:00.000Z";

const OP_TODAY: DeniedMeltOp = { id: "op-today", amount: 500, created: TODAY };
const OP_LAST_WEEK: DeniedMeltOp = { id: "op-lastweek", amount: 0, created: LAST_WEEK };
const OP_OLD: DeniedMeltOp = { id: "op-old", amount: 1000, created: OLD };

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function renderIntoDom(element: ReactElement): HTMLDivElement {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const mountRoot = createRoot(mount);
  act(() => {
    mountRoot.render(element);
  });
  root = mountRoot;
  container = mount;
  return mount;
}

function renderPage(): HTMLDivElement {
  return renderIntoDom(
    <IntlProvider locale="en">
      <MemoryRouter>
        <MeltRequestsPage />
      </MemoryRouter>
    </IntlProvider>
  );
}

function clickButtonByText(page: HTMLDivElement, label: string) {
  const button = Array.from(page.querySelectorAll("button")).find((node) => node.textContent === label);
  expect(button, `Button with label "${label}" not found`).not.toBeUndefined();
  act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function clickSelectItem(page: HTMLDivElement, value: string) {
  const button = page.querySelector(`[data-select-item="${value}"]`);
  expect(button, `Select item "${value}" not found`).not.toBeNull();
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing select item: ${value}`);
  }
  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function orderedOperationIds(page: HTMLDivElement): string[] {
  return Array.from(page.querySelectorAll("tr[data-operation-id]")).map((node) => node.getAttribute("data-operation-id") ?? "");
}

function mockOpsQuery(ops: DeniedMeltOp[], overrides: Partial<QueryResult> = {}) {
  mockUseQuery.mockReturnValue({
    data: { ops },
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-02-20T12:00:00.000Z"));
  nextSearchQuery = "";

  mockDeleteHookReturn.deleteTarget = null;
  mockDeleteHookReturn.setDeleteTarget = vi.fn();
  mockDeleteHookReturn.confirmDelete = vi.fn();
  mockDeleteHookReturn.closeDeleteConfirmation = vi.fn();
  mockDeleteHookReturn.deletingId = undefined;
  mockDeleteHookReturn.isDeleting = false;

  if (root && container) {
    act(() => {
      root?.unmount();
    });
    container.remove();
    root = null;
    container = null;
  }
});

describe("MeltRequestsPage", () => {
  describe("loading and error states", () => {
    it("shows skeleton loader while data is loading", () => {
      mockUseQuery.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null });
      const page = renderPage();
      const skeletons = page.querySelectorAll(".animate-pulse, [class*='skeleton'], [data-slot='skeleton']");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("shows error state with message when query fails", () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("network failure"),
        refetch: vi.fn(),
      });
      const page = renderPage();
      expect(page.textContent).toContain("Failed to load denied melt requests");
      expect(page.textContent).toContain("network failure");
    });

    it("shows empty state when there are no denied melt requests", () => {
      mockOpsQuery([]);
      const page = renderPage();
      expect(page.textContent).toContain("No denied melt requests found");
    });
  });

  describe("operations table", () => {
    it("renders a row for each operation with its ID and amount", () => {
      mockOpsQuery([OP_TODAY, OP_LAST_WEEK]);
      const page = renderPage();
      expect(page.textContent).toContain("op-today");
      expect(page.textContent).toContain("op-lastweek");
      expect(page.textContent).toContain("500 sat");
      expect(page.textContent).toContain("0 sat");
    });

    it("links each row to the corresponding quote detail page", () => {
      mockOpsQuery([OP_TODAY, OP_OLD]);
      const page = renderPage();
      expect(orderedOperationIds(page)).toEqual(["op-today", "op-old"]);
    });

    it("shows no-match message when search query matches nothing", () => {
      mockOpsQuery([OP_TODAY, OP_LAST_WEEK]);
      nextSearchQuery = "zzz-no-match-zzz";
      const page = renderPage();
      clickButtonByText(page, "SearchMock");
      expect(page.textContent).toContain("No melt requests match your filters");
    });
  });

  describe("time-based filters", () => {
    it("'Created today' filter shows only operations created today (UTC)", () => {
      mockOpsQuery([OP_TODAY, OP_LAST_WEEK, OP_OLD]);
      const page = renderPage();
      clickSelectItem(page, "today");
      const links = orderedOperationIds(page);
      expect(links).toContain("op-today");
      expect(links).not.toContain("op-lastweek");
      expect(links).not.toContain("op-old");
    });

    it("'Last 7 days' filter excludes operations older than 7 UTC days", () => {
      mockOpsQuery([OP_TODAY, OP_LAST_WEEK, OP_OLD]);
      const page = renderPage();
      clickSelectItem(page, "last-7-days");
      const links = orderedOperationIds(page);
      expect(links).toContain("op-today");
      expect(links).toContain("op-lastweek");
      expect(links).not.toContain("op-old");
    });

    it("time bucket changes when the clock advances past UTC midnight", () => {
      // Start just before midnight on 2026-02-20
      vi.setSystemTime(new Date("2026-02-20T23:59:00.000Z"));
      const opNewDay: DeniedMeltOp = { id: "op-newday", amount: 10, created: "2026-02-21T00:01:00.000Z" };
      mockOpsQuery([OP_TODAY, opNewDay]);

      const page = renderPage();
      clickSelectItem(page, "today");
      // Before midnight: only OP_TODAY qualifies for "today"
      expect(orderedOperationIds(page)).toEqual(["op-today"]);

      // Advance past midnight into 2026-02-21 — re-render to trigger fresh bucket
      vi.setSystemTime(new Date("2026-02-21T00:05:00.000Z"));
      act(() => {
        root?.render(
          <IntlProvider locale="en">
            <MemoryRouter>
              <MeltRequestsPage />
            </MemoryRouter>
          </IntlProvider>
        );
      });
      // Now "today" is 2026-02-21 so opNewDay qualifies, OP_TODAY does not
      expect(orderedOperationIds(page)).toEqual(["op-newday"]);
    });
  });

  describe("amount-based filters", () => {
    it("'Zero amount' filter shows only zero-amount operations", () => {
      mockOpsQuery([OP_TODAY, OP_LAST_WEEK, OP_OLD]);
      const page = renderPage();
      clickSelectItem(page, "zero-amount");
      const links = orderedOperationIds(page);
      expect(links).toEqual(["op-lastweek"]);
    });

    it("'Non-zero amount' filter hides zero-amount operations", () => {
      mockOpsQuery([OP_TODAY, OP_LAST_WEEK, OP_OLD]);
      const page = renderPage();
      clickSelectItem(page, "non-zero-amount");
      const links = orderedOperationIds(page);
      expect(links).not.toContain("op-lastweek");
      expect(links).toContain("op-today");
      expect(links).toContain("op-old");
    });
  });

  describe("sorting", () => {
    it("sorts by amount ascending on first click, descending on second click", () => {
      mockOpsQuery([OP_TODAY, OP_OLD, OP_LAST_WEEK]);
      const page = renderPage();

      // First click: amount-asc (0, 500, 1000)
      clickButtonByText(page, "sort-amount");
      expect(orderedOperationIds(page)).toEqual(["op-lastweek", "op-today", "op-old"]);

      // Second click: amount-desc (1000, 500, 0)
      clickButtonByText(page, "sort-amount");
      expect(orderedOperationIds(page)).toEqual(["op-old", "op-today", "op-lastweek"]);
    });

    it("sorts by request ID ascending", () => {
      mockOpsQuery([OP_OLD, OP_LAST_WEEK, OP_TODAY]);
      const page = renderPage();

      clickButtonByText(page, "sort-id");
      // op-lastweek, op-old, op-today (lexicographic)
      expect(orderedOperationIds(page)).toEqual(["op-lastweek", "op-old", "op-today"]);
    });

    it("defaults to created-desc (newest first)", () => {
      mockOpsQuery([OP_OLD, OP_TODAY, OP_LAST_WEEK]);
      const page = renderPage();
      expect(orderedOperationIds(page)).toEqual(["op-today", "op-lastweek", "op-old"]);
    });
  });

  describe("delete confirmation", () => {
    it("calls setDeleteTarget with the operation when delete button is clicked", () => {
      mockOpsQuery([OP_TODAY]);
      const page = renderPage();

      const deleteButton = page.querySelector('button[aria-label="Delete denied melt request"]');
      expect(deleteButton).not.toBeNull();
      act(() => {
        deleteButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(mockDeleteHookReturn.setDeleteTarget).toHaveBeenCalledWith(OP_TODAY);
    });

    it("renders the confirmation drawer when deleteTarget is set", () => {
      mockOpsQuery([OP_TODAY]);
      mockDeleteHookReturn.deleteTarget = OP_TODAY;

      const page = renderPage();
      const drawer = page.querySelector('[data-drawer="confirm"]');
      expect(drawer).not.toBeNull();
      expect(drawer?.textContent).toContain("op-today");
    });

    it("calls confirmDelete when the confirm button is clicked in the drawer", () => {
      mockOpsQuery([OP_TODAY]);
      mockDeleteHookReturn.deleteTarget = OP_TODAY;

      const page = renderPage();
      const confirmButton = page.querySelector('[data-action="confirm-submit"]');
      expect(confirmButton).not.toBeNull();
      act(() => {
        confirmButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(mockDeleteHookReturn.confirmDelete).toHaveBeenCalledOnce();
    });
  });

  describe("summary and refresh", () => {
    it("shows total request count when no filters are active", () => {
      mockOpsQuery([OP_TODAY, OP_LAST_WEEK, OP_OLD]);
      const page = renderPage();
      expect(page.textContent).toContain("3 denied requests");
    });

    it("shows filtered count when a filter is active", () => {
      mockOpsQuery([OP_TODAY, OP_LAST_WEEK, OP_OLD]);
      const page = renderPage();
      clickSelectItem(page, "today");
      expect(page.textContent).toContain("Showing 1 of 3 requests");
    });
  });
});
