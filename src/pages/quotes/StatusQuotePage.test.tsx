import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { IntlProvider } from "react-intl"
import { MemoryRouter } from "react-router"
import StatusQuotePage from "./StatusQuotePage"

const mockUseQuery = vi.fn()
const mockUseQueries = vi.fn()

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}))

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query")
  return {
    ...actual,
    useQuery: (...args: unknown[]) => mockUseQuery(...args),
    useQueries: (...args: unknown[]) => mockUseQueries(...args),
  }
})

vi.mock("@/generated/client/@tanstack/react-query.gen", () => ({
  listQuotesOptions: () => ({ queryKey: [{ _id: "listQuotes" }] }),
  getQuoteOptions: ({ path }: { path: { qid: string } }) => ({ queryKey: [{ _id: "getQuote", path }] }),
}))

function renderPage(status?: "Accepted" | "Pending") {
  return render(
    <IntlProvider locale="en">
      <MemoryRouter>
        <StatusQuotePage status={status} />
      </MemoryRouter>
    </IntlProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()

  mockUseQuery.mockImplementation((opts: { queryKey: Array<{ _id: string; path?: { qid: string } }> }) => {
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

  mockUseQueries.mockImplementation(
    ({ queries }: { queries: Array<{ queryKey?: Array<{ path?: { qid: string } }> }> }) =>
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
    renderPage()
    expect(screen.getByText("All quotes")).toBeInTheDocument()
  })

  it("filters cards by status", () => {
    renderPage("Accepted")

    expect(screen.getByText("Accepted quotes")).toBeInTheDocument()
    expect(screen.getByText("quote-accepted")).toBeInTheDocument()
    expect(screen.queryByText("quote-pending")).not.toBeInTheDocument()
  })
})
