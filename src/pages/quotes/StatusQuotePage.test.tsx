import { act, type ReactElement, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { IntlProvider } from "react-intl"
import { MemoryRouter } from "react-router"
import StatusQuotePage from "./StatusQuotePage"

interface QueryKeyEntry {
  _id: string
  path?: { qid: string }
  query?: {
    bill_maturity_date_from?: string | null
    status?: string | null
  }
}
interface QueryOptions {
  queryKey: QueryKeyEntry[]
}
interface QueryResult {
  data: unknown
  isLoading: boolean
  isFetching?: boolean
  error: Error | null
}
interface UseQueriesArgs {
  queries: { queryKey?: { path?: { qid: string } }[] }[]
}
interface UseQueriesResultItem {
  data: unknown
  isLoading: boolean
}

const mockUseQuery = vi.fn<(options: QueryOptions) => QueryResult>()
const mockUseQueries = vi.fn<(args: UseQueriesArgs) => UseQueriesResultItem[]>()

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}))

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string
    onValueChange: (value: string) => void
    children: ReactNode
  }) => (
    <select
      data-testid="items-per-page-select"
      value={value}
      onChange={(event) => onValueChange((event.target as HTMLSelectElement).value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
}))

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query")
  return {
    ...actual,
    useQuery: (options: QueryOptions) => mockUseQuery(options),
    useQueries: (args: UseQueriesArgs) => mockUseQueries(args),
  }
})

vi.mock("@/generated/client/@tanstack/react-query.gen", () => ({
  listQuotesOptions: (options?: QueryKeyEntry) => ({ queryKey: [{ _id: "listQuotes", query: options?.query }] }),
  getQuoteOptions: ({ path }: { path: { qid: string } }) => ({ queryKey: [{ _id: "getQuote", path }] }),
}))

let root: Root | null = null
let container: HTMLDivElement | null = null

function renderIntoDom(element: ReactElement): HTMLDivElement {
  const mount = document.createElement("div")
  document.body.appendChild(mount)
  const mountRoot = createRoot(mount)
  act(() => {
    mountRoot.render(element)
  })
  root = mountRoot
  container = mount
  return mount
}

function renderPage(status?: "Accepted" | "Pending"): HTMLDivElement {
  return renderIntoDom(
    <IntlProvider locale="en">
      <MemoryRouter>
        <StatusQuotePage status={status} />
      </MemoryRouter>
    </IntlProvider>,
  )
}

function rerenderPage(status?: "Accepted" | "Pending"): HTMLDivElement {
  if (!root || !container) {
    throw new Error("Cannot rerender before initial render")
  }

  act(() => {
    root?.render(
      <IntlProvider locale="en">
        <MemoryRouter>
          <StatusQuotePage status={status} />
        </MemoryRouter>
      </IntlProvider>,
    )
  })

  return container
}

const toDate = (index: number) => `2026-02-${String(index).padStart(2, "0")}`
const quoteIndexFromId = (qid?: string): number => {
  if (!qid) return 1
  const parsed = Number(qid.replace("quote-", ""))
  return Number.isFinite(parsed) ? parsed : 1
}

const allQuotes = Array.from({ length: 30 }, (_, idx) => ({
  id: `quote-${idx + 1}`,
  status: idx % 2 === 0 ? "Accepted" : "Pending",
  sum: (idx + 1) * 10,
}))

beforeEach(() => {
  vi.clearAllMocks()
  if (root && container) {
    act(() => {
      root?.unmount()
    })
    container.remove()
    root = null
    container = null
  }

  mockUseQuery.mockImplementation((opts: QueryOptions) => {
    const id = opts.queryKey[0]._id
    if (id === "listQuotes") {
      const statusFilter = opts.queryKey[0].query?.status
      const maturityFrom = opts.queryKey[0].query?.bill_maturity_date_from
      let quotes = [...allQuotes]

      if (statusFilter) {
        quotes = quotes.filter((quote) => quote.status === statusFilter)
      }

      if (maturityFrom) {
        const fromDate = new Date(`${maturityFrom}T00:00:00Z`).getTime()
        quotes = quotes.filter((quote) => {
          const quoteDate = new Date(`${toDate(quoteIndexFromId(quote.id))}T00:00:00Z`).getTime()
          return quoteDate >= fromDate
        })
      }

      return {
        data: { quotes },
        isLoading: false,
        isFetching: false,
        error: null,
      }
    }

    if (id === "getQuote") {
      return {
        data: {
          bill: {
            id: `bill-${opts.queryKey[0].path?.qid ?? "x"}`,
            maturity_date: toDate(quoteIndexFromId(opts.queryKey[0].path?.qid)),
            drawee: {},
            drawer: {},
            payee: {},
            endorsees: [],
          },
        },
        isLoading: false,
        error: null,
      }
    }

    return { data: undefined, isLoading: false, isFetching: false, error: null }
  })

  mockUseQueries.mockImplementation(({ queries }: UseQueriesArgs) =>
    queries.map((query) => ({
      data: {
        bill: {
          id: `bill-${query.queryKey?.[0]?.path?.qid ?? "x"}`,
          maturity_date: toDate(quoteIndexFromId(query.queryKey?.[0]?.path?.qid)),
        },
      },
      isLoading: false,
    })),
  )
})

describe("StatusQuotePage", () => {
  it("shows all quotes page title when no status filter is passed", () => {
    const page = renderPage()
    expect(page.textContent).toContain("All quotes")
  })

  it("filters cards by status", () => {
    const page = renderPage("Accepted")
    expect(page.textContent).toContain("Accepted quotes")
    expect(page.textContent).toContain("quote-1")
    expect(page.textContent).not.toContain("quote-2")
  })

  it("shows API error state when quotes query fails", () => {
    mockUseQuery.mockImplementation((opts: QueryOptions) => {
      if (opts.queryKey[0]._id === "listQuotes") {
        return {
          data: undefined,
          isLoading: false,
          isFetching: false,
          error: new Error("network down"),
        }
      }
      return { data: undefined, isLoading: false, isFetching: false, error: null }
    })
    mockUseQueries.mockReturnValue([])

    const page = renderPage()
    expect(page.textContent).toContain("Failed to load quotes")
    expect(page.textContent).toContain("network down")
  })

  it("shows empty state when quotes list is empty", () => {
    mockUseQuery.mockImplementation((opts: QueryOptions) => {
      if (opts.queryKey[0]._id === "listQuotes") {
        return {
          data: { quotes: [] },
          isLoading: false,
          isFetching: false,
          error: null,
        }
      }
      return { data: undefined, isLoading: false, isFetching: false, error: null }
    })
    mockUseQueries.mockReturnValue([])

    const page = renderPage()
    expect(page.textContent).toContain("No quotes available.")
  })

  it("enables next and disables previous on first page", () => {
    const page = renderPage()
    const previousButton = Array.from(page.querySelectorAll("button")).find((btn) => btn.textContent === "Previous")
    const nextButton = Array.from(page.querySelectorAll("button")).find((btn) => btn.textContent === "Next")

    expect(previousButton?.hasAttribute("disabled")).toBe(true)
    expect(nextButton?.hasAttribute("disabled")).toBe(false)
  })

  it("advances page when clicking next and updates list query cursor", () => {
    const page = renderPage()
    const nextButton = Array.from(page.querySelectorAll("button")).find((btn) => btn.textContent === "Next")

    act(() => {
      nextButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    const listCalls = mockUseQuery.mock.calls.filter((call) => call[0].queryKey[0]._id === "listQuotes")
    const lastListCall = listCalls[listCalls.length - 1]?.[0]

    expect(lastListCall?.queryKey[0].query?.bill_maturity_date_from).toBe("2026-02-10")
  })

  it("resets paging cursor when status changes", () => {
    const page = renderPage()
    const nextButton = Array.from(page.querySelectorAll("button")).find((btn) => btn.textContent === "Next")

    act(() => {
      nextButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    rerenderPage("Accepted")

    const listCalls = mockUseQuery.mock.calls.filter((call) => call[0].queryKey[0]._id === "listQuotes")
    const lastListCall = listCalls[listCalls.length - 1]?.[0]

    expect(lastListCall?.queryKey[0].query?.status).toBe("Accepted")
    expect(lastListCall?.queryKey[0].query?.bill_maturity_date_from ?? null).toBeNull()
  })

  it("resets paging cursor when items per page changes", () => {
    const page = renderPage()
    const nextButton = Array.from(page.querySelectorAll("button")).find((btn) => btn.textContent === "Next")
    const select = page.querySelector<HTMLSelectElement>('[data-testid="items-per-page-select"]')!

    act(() => {
      nextButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    act(() => {
      select.value = "100"
      select.dispatchEvent(new Event("change", { bubbles: true }))
    })

    const listCalls = mockUseQuery.mock.calls.filter((call) => call[0].queryKey[0]._id === "listQuotes")
    const lastListCall = listCalls[listCalls.length - 1]?.[0]

    expect(lastListCall?.queryKey[0].query?.bill_maturity_date_from ?? null).toBeNull()
  })
})
