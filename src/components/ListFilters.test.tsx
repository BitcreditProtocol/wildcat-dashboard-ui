import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IntlProvider } from "react-intl";
import { FilterGroupSection, type FilterGroup } from "./ListFilters";
import { createSortGroup } from "./sort-filter-group";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function renderWithIntl(element: ReactElement): HTMLDivElement {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const mountRoot = createRoot(mount);
  act(() => {
    mountRoot.render(<IntlProvider locale="en">{element}</IntlProvider>);
  });
  root = mountRoot;
  container = mount;
  return mount;
}

function buttonByLabel(page: HTMLDivElement, label: string) {
  const button = Array.from(page.querySelectorAll("button")).find((node) => node.textContent?.trim().startsWith(label));
  expect(button, `Option "${label}" not found`).not.toBeUndefined();
  if (!button) {
    throw new Error(`Missing option: ${label}`);
  }
  return button;
}

function click(button: HTMLButtonElement) {
  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

afterEach(() => {
  // React keeps timers running until the tree unmounts, and vitest tears the jsdom
  // environment down right after the last test — unmount here so nothing fires after it.
  if (root && container) {
    act(() => {
      root?.unmount();
    });
    container.remove();
    root = null;
    container = null;
  }
});

describe("FilterGroupSection", () => {
  it("marks the selected option and reports what was picked", () => {
    const onSelect = vi.fn();
    const group: FilterGroup = {
      id: "show",
      title: "Show",
      value: "all",
      options: [
        { value: "all", label: "All quotes" },
        { value: "requested-to-pay", label: "Requested to pay" },
      ],
      onSelect,
    };

    const page = renderWithIntl(<FilterGroupSection group={group} />);

    expect(buttonByLabel(page, "All quotes").getAttribute("aria-pressed")).toBe("true");
    expect(buttonByLabel(page, "Requested to pay").getAttribute("aria-pressed")).toBe("false");

    click(buttonByLabel(page, "Requested to pay"));
    expect(onSelect).toHaveBeenCalledWith("requested-to-pay");
  });
});

describe("createSortGroup", () => {
  it("selects the field the list is sorted on, whichever direction it runs in", () => {
    const group = createSortGroup({
      title: "Sort by",
      sortBy: "statusChange-desc",
      options: [
        { field: "maturity", label: "Maturity" },
        { field: "statusChange", label: "Last status change" },
      ],
      onSortChange: vi.fn(),
    });

    expect(group.value).toBe("statusChange");
  });

  it("passes the field on so picking the sorted one flips the direction", () => {
    const onSortChange = vi.fn();
    const group = createSortGroup({
      title: "Sort by",
      sortBy: "maturity-asc",
      options: [
        { field: "maturity", label: "Maturity" },
        { field: "statusChange", label: "Last status change" },
      ],
      onSortChange,
    });

    const page = renderWithIntl(<FilterGroupSection group={group} />);
    click(buttonByLabel(page, "Maturity"));

    expect(onSortChange).toHaveBeenCalledWith("maturity");
  });
});
