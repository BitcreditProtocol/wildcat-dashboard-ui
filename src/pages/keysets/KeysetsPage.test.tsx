import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { IntlProvider } from "react-intl"
import { MemoryRouter } from "react-router"
import KeysetsPage from "./KeysetsPage"

const mockUseQuery = vi.fn()

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query")
  return {
    ...actual,
    useQuery: (...args: unknown[]) => mockUseQuery(...args),
  }
})

vi.mock("@/generated/client/@tanstack/react-query.gen", () => ({
  listKeysetInfosOptions: () => ({ queryKey: [{ _id: "listKeysetInfos" }] }),
}))

function renderPage() {
  return render(
    <IntlProvider locale="en">
      <MemoryRouter>
        <KeysetsPage />
      </MemoryRouter>
    </IntlProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("KeysetsPage", () => {
  it("shows empty state when no keysets are returned", () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false })

    renderPage()
    expect(screen.getByText("No keysets found")).toBeInTheDocument()
  })

  it("renders keyset cards from API data", () => {
    mockUseQuery.mockReturnValue({
      data: [{ id: "keyset-abc", active: true, final_expiry: 1771545600, unit: "sat" }],
      isLoading: false,
    })

    renderPage()
    expect(screen.getByText("keyset-abc")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute("href", "/keysets/keyset-abc")
  })
})
