import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { IntlProvider } from "react-intl"
import { MemoryRouter } from "react-router"
import KeysetsPage from "./KeysetsPage"

interface QueryOptions {
  queryKey: { _id: string }[]
}
interface QueryResult {
  data: unknown
  isLoading: boolean
}

const mockUseQuery = vi.fn<(options: QueryOptions) => QueryResult>()

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query")
  return {
    ...actual,
    useQuery: (options: QueryOptions) => mockUseQuery(options),
  }
})

vi.mock("@/generated/client/@tanstack/react-query.gen", () => ({
  listKeysetInfosOptions: () => ({ queryKey: [{ _id: "listKeysetInfos" }] }),
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

function renderPage(): HTMLDivElement {
  return renderIntoDom(
    <IntlProvider locale="en">
      <MemoryRouter>
        <KeysetsPage />
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
})

describe("KeysetsPage", () => {
  it("shows empty state when no keysets are returned", () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false })

    const page = renderPage()
    expect(page.textContent).toContain("No keysets found")
  })

  it("renders keyset cards from API data", () => {
    mockUseQuery.mockReturnValue({
      data: [{ id: "keyset-abc", active: true, final_expiry: 1771545600, unit: "sat" }],
      isLoading: false,
    })

    const page = renderPage()
    expect(page.textContent).toContain("keyset-abc")

    const links = Array.from(page.querySelectorAll('a[href="/keysets/keyset-abc"]'))
    expect(links.length).toBeGreaterThan(0)
    expect(links.some((link) => (link.textContent ?? "").includes("View"))).toBe(true)
  })
})
