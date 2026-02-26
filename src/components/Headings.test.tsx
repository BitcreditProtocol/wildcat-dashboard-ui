import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { beforeEach, describe, expect, it } from "vitest"
import { H1, H2, H3 } from "./Headings"

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

beforeEach(() => {
  if (root && container) {
    act(() => {
      root?.unmount()
    })
    container.remove()
    root = null
    container = null
  }
})

describe("Headings", () => {
  it("renders H1, H2 and H3 tags", () => {
    const page = renderIntoDom(
      <div>
        <H1>Title One</H1>
        <H2>Title Two</H2>
        <H3>Title Three</H3>
      </div>,
    )

    expect(page.querySelector("h1")?.textContent).toBe("Title One")
    expect(page.querySelector("h2")?.textContent).toBe("Title Two")
    expect(page.querySelector("h3")?.textContent).toBe("Title Three")
  })
})
