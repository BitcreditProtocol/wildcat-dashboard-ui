import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { IntlProvider } from "react-intl"
import { MemoryRouter, Route, Routes } from "react-router"
import QuotePage from "./QuotePage"

const mockUseQuery = vi.fn()
const mockUseMutation = vi.fn()

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}))

vi.mock("./QuoteActions.tsx", () => ({
  QuoteActions: () => <div>QuoteActionsMock</div>,
}))

vi.mock("@/components/EndorsementChain", () => ({
  EndorsementChain: () => <div>EndorsementChainMock</div>,
}))

vi.mock("@/components/ParticipantsOverview", () => ({
  ParticipantsOverviewCard: () => <div>ParticipantsOverviewMock</div>,
  ParticipantDetail: () => <div>ParticipantDetailMock</div>,
}))

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query")
  return {
    ...actual,
    useQuery: (...args: unknown[]) => mockUseQuery(...args),
    useMutation: (...args: unknown[]) => mockUseMutation(...args),
  }
})

vi.mock("@/generated/client/@tanstack/react-query.gen", () => ({
  getQuoteOptions: ({ path }: { path: { qid: string } }) => ({ queryKey: [{ _id: "getQuote", path }] }),
  listEbillsOptions: () => ({ queryKey: [{ _id: "listEbills" }] }),
  getEbillEndorsementsOptions: ({ path }: { path: { bid: string } }) => ({
    queryKey: [{ _id: "getEbillEndorsements", path }],
  }),
  getEbillMintCompleteOptions: ({ path }: { path: { bid: string } }) => ({
    queryKey: [{ _id: "getEbillMintComplete", path }],
  }),
  postTokenStatusMutation: () => ({ mutationFn: vi.fn() }),
}))

function renderPage(entry: string | { pathname: string; state?: Record<string, unknown> }) {
  return render(
    <IntlProvider locale="en">
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/quotes/:id" element={<QuotePage />} />
        </Routes>
      </MemoryRouter>
    </IntlProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()

  mockUseMutation.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    data: undefined,
  })

  mockUseQuery.mockImplementation(
    (opts: { queryKey: Array<{ _id: string; path?: { qid?: string; bid?: string } }> }) => {
      const id = opts.queryKey[0]._id
      if (id === "getQuote") {
        return {
          data: {
            id: opts.queryKey[0].path?.qid ?? "quote-1",
            status: "Accepted",
            keyset_id: "keyset-from-quote",
            bill: {
              id: "bill-1",
              sum: 100,
              maturity_date: "2026-03-01",
              drawee: {},
              drawer: {},
              payee: {},
              endorsees: [],
            },
          },
          isLoading: false,
          isFetching: false,
          error: null,
        }
      }

      if (id === "listEbills") {
        return { data: [], isLoading: false, error: null }
      }

      if (id === "getEbillEndorsements") {
        return { data: [], isLoading: false, error: null }
      }

      if (id === "getEbillMintComplete") {
        return { data: { complete: false }, isLoading: false, error: null }
      }

      return { data: undefined, isLoading: false, isFetching: false, error: null }
    },
  )
})

describe("QuotePage", () => {
  it("shows back-to-keyset action when navigated from a keyset page", () => {
    renderPage({ pathname: "/quotes/quote-1", state: { from: "/keysets/keyset-1234" } })
    expect(screen.getByRole("link", { name: /Back to keyset/i })).toHaveAttribute("href", "/keysets/keyset-1234")
  })

  it("shows go-to-keyset action from quote data when no navigation state is provided", () => {
    renderPage("/quotes/quote-1")
    expect(screen.getByRole("link", { name: /Go to keyset/i })).toHaveAttribute("href", "/keysets/keyset-from-quote")
  })
})
