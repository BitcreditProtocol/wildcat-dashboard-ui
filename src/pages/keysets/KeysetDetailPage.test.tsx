import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { IntlProvider } from "react-intl"
import { MemoryRouter, Route, Routes } from "react-router"
import KeysetDetailPage from "./KeysetDetailPage"

const mockUseQuery = vi.fn()
const mockUseQueries = vi.fn()
const mockUseMutation = vi.fn()
const mutateSpy = vi.fn()

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query")
  return {
    ...actual,
    useQuery: (...args: unknown[]) => mockUseQuery(...args),
    useQueries: (...args: unknown[]) => mockUseQueries(...args),
    useMutation: (...args: unknown[]) => mockUseMutation(...args),
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  }
})

vi.mock("@/generated/client/@tanstack/react-query.gen", () => ({
  listKeysetInfosOptions: () => ({ queryKey: [{ _id: "listKeysetInfos" }] }),
  listQuotesOptions: () => ({ queryKey: [{ _id: "listQuotes" }] }),
  listEbillsOptions: () => ({ queryKey: [{ _id: "listEbills" }] }),
  getQuoteOptions: ({ path }: { path: { qid: string } }) => ({ queryKey: [{ _id: "getQuote", path }] }),
  getEbillMintCompleteOptions: ({ path }: { path: { bid: string } }) => ({
    queryKey: [{ _id: "getEbillMintComplete", path }],
  }),
  postEnableRedemptionMutation: () => ({ mutationFn: vi.fn() }),
  listKeysetInfosQueryKey: () => [{ _id: "listKeysetInfos" }],
}))

function renderPage(route: string) {
  return render(
    <IntlProvider locale="en">
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/keysets/:keysetId" element={<KeysetDetailPage />} />
          <Route path="/keysets" element={<KeysetDetailPage />} />
        </Routes>
      </MemoryRouter>
    </IntlProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseMutation.mockReturnValue({ mutate: mutateSpy, isPending: false })
  mockUseQueries.mockImplementation(
    ({ queries }: { queries: Array<{ queryKey?: Array<{ _id?: string }> }> }) => {
      const id = queries[0]?.queryKey?.[0]?._id
      if (id === "getQuote") {
        return [{ isLoading: false, data: { bill: { id: "bill-1", maturity_date: "2026-02-20" } } }]
      }
      if (id === "getEbillMintComplete") {
        return [{ isLoading: false, data: { complete: true } }]
      }
      return []
    },
  )
})

describe("KeysetDetailPage", () => {
  it("shows invalid keyset id when route has no :keysetId", () => {
    renderPage("/keysets")
    expect(screen.getByText("Invalid keyset ID")).toBeInTheDocument()
  })

  it("shows not found when keyset does not exist", () => {
    mockUseQuery.mockImplementation((opts: { queryKey: Array<{ _id: string }> }) => {
      const id = opts.queryKey[0]._id
      if (id === "listKeysetInfos") {
        return { data: [{ id: "other-keyset" }], isLoading: false }
      }
      if (id === "listQuotes") {
        return { data: { quotes: [] }, isLoading: false }
      }
      if (id === "listEbills") {
        return { data: [], isLoading: false }
      }
      return { data: undefined, isLoading: false }
    })

    renderPage("/keysets/target-keyset")
    expect(screen.getByText("Keyset not found")).toBeInTheDocument()
  })

  it("enables redemption and calls mutation when Redeem is clicked", () => {
    mockUseQuery.mockImplementation((opts: { queryKey: Array<{ _id: string }> }) => {
      const id = opts.queryKey[0]._id
      if (id === "listKeysetInfos") {
        return {
          data: [{ id: "keyset-1", active: true, final_expiry: 1771545600, unit: "sat" }],
          isLoading: false,
        }
      }
      if (id === "listQuotes") {
        return { data: { quotes: [{ id: "quote-1", status: "Pending", sum: 100 }] }, isLoading: false }
      }
      if (id === "listEbills") {
        return { data: [{ id: "bill-1", status: { payment: { paid: true } } }], isLoading: false }
      }
      return { data: undefined, isLoading: false }
    })

    renderPage("/keysets/keyset-1")
    const button = screen.getByRole("button", { name: "Redeem" })
    expect(button).toBeEnabled()

    fireEvent.click(button)
    expect(mutateSpy).toHaveBeenCalledWith({ body: { kid: "keyset-1" } })
  })
})
