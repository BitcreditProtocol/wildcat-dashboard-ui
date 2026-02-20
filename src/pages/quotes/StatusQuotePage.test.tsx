import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { IntlProvider } from "react-intl"
import { MemoryRouter } from "react-router"
import StatusQuotePage from "./StatusQuotePage"

interface QueryKeyEntry {
  _id: string
  path?: { qid: string }
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

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query")
  return {
    ...actual,
    useQuery: (options: QueryOptions) => mockUseQuery(options),
    useQueries: (args: UseQueriesArgs) => mockUseQueries(args),
  }
})

vi.mock("@/generated/client/@tanstack/react-query.gen", () => ({
  listQuotesOptions: () => ({ queryKey: [{ _id: "listQuotes" }] }),
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
      return {
        data: {
          quotes: [
            { id: "quote-accepted", status: "Accepted", sum: 300 },
            { id: "quote-pending", status: "Pending", sum: 100 },
          ],
        },
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
            maturity_date: "2026-02-20",
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
          maturity_date: "2026-02-20",
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
    expect(page.textContent).toContain("quote-accepted")
    expect(page.textContent).not.toContain("quote-pending")
  })
})
