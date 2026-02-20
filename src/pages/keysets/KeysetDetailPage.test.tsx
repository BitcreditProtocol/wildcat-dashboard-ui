import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { IntlProvider } from "react-intl"
import { MemoryRouter, Route, Routes } from "react-router"
import KeysetDetailPage from "./KeysetDetailPage"

interface QueryKeyEntry {
  _id: string
}

interface QueryOptions {
  queryKey: QueryKeyEntry[]
}

interface QueryResult {
  data: unknown
  isLoading: boolean
}

interface UseQueriesArgs {
  queries: { queryKey?: { _id?: string }[] }[]
}

interface UseQueriesResultItem {
  isLoading: boolean
  data?: { bill?: { id?: string; maturity_date?: string }; complete?: boolean }
}

interface MutationResult {
  mutate: (value: { body: { kid: string } }) => void
  isPending: boolean
}

const mockUseQuery = vi.fn<(options: QueryOptions) => QueryResult>()
const mockUseQueries = vi.fn<(args: UseQueriesArgs) => UseQueriesResultItem[]>()
const mockUseMutation = vi.fn<() => MutationResult>()
const mutateSpy = vi.fn<(value: { body: { kid: string } }) => void>()

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query")
  return {
    ...actual,
    useQuery: (options: QueryOptions) => mockUseQuery(options),
    useQueries: (args: UseQueriesArgs) => mockUseQueries(args),
    useMutation: () => mockUseMutation(),
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

function renderPage(route: string): HTMLDivElement {
  return renderIntoDom(
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
  if (root && container) {
    act(() => {
      root?.unmount()
    })
    container.remove()
    root = null
    container = null
  }
  mockUseMutation.mockReturnValue({ mutate: mutateSpy, isPending: false })
  mockUseQueries.mockImplementation(({ queries }: UseQueriesArgs) => {
    const id = queries[0]?.queryKey?.[0]?._id
    if (id === "getQuote") {
      return [{ isLoading: false, data: { bill: { id: "bill-1", maturity_date: "2026-02-20" } } }]
    }
    if (id === "getEbillMintComplete") {
      return [{ isLoading: false, data: { complete: true } }]
    }
    return []
  })
})

describe("KeysetDetailPage", () => {
  it("shows invalid keyset id when route has no :keysetId", () => {
    const page = renderPage("/keysets")
    expect(page.textContent).toContain("Invalid keyset ID")
  })

  it("shows not found when keyset does not exist", () => {
    mockUseQuery.mockImplementation((opts: QueryOptions) => {
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

    const page = renderPage("/keysets/target-keyset")
    expect(page.textContent).toContain("Keyset not found")
  })

  it("enables redemption and calls mutation when Redeem is clicked", () => {
    mockUseQuery.mockImplementation((opts: QueryOptions) => {
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

    const page = renderPage("/keysets/keyset-1")
    const redeemButton = Array.from(page.querySelectorAll("button")).find((button) => button.textContent === "Redeem")
    expect(redeemButton?.disabled).toBe(false)
    act(() => {
      redeemButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
    expect(mutateSpy).toHaveBeenCalledWith({ body: { kid: "keyset-1" } })
  })
})
