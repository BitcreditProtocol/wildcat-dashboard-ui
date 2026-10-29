import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { HistoryTable, type HistoryTableColumn } from "./HistoryTable";

interface Row {
  id: string;
  at: number;
}

const columns: HistoryTableColumn<Row>[] = [
  { key: "id", header: "Id", cell: (row) => row.id },
  { key: "at", header: "At", cell: (row) => row.at, sortValue: (row) => row.at },
];

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function render(rows: Row[]) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(<HistoryTable columns={columns} rows={rows} rowKey={(row) => row.id} defaultSort={{ key: "at", direction: "asc" }} />);
  });
  return container;
}

function bodyOrder(table: HTMLElement) {
  return [...table.querySelectorAll("tbody tr")].map((row) => row.firstElementChild?.textContent);
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("HistoryTable sorting", () => {
  it("opens in the default order and flips it from the column header", () => {
    const table = render([
      { id: "late", at: 3 },
      { id: "early", at: 1 },
      { id: "middle", at: 2 },
    ]);

    expect(bodyOrder(table)).toEqual(["early", "middle", "late"]);
    expect(table.querySelector('th[aria-sort="ascending"]')?.textContent).toBe("At");

    act(() => {
      table.querySelector<HTMLButtonElement>("th button")?.click();
    });

    expect(bodyOrder(table)).toEqual(["late", "middle", "early"]);
    expect(table.querySelector('th[aria-sort="descending"]')).not.toBeNull();
  });

  it("reverses rows with equal values along with the rest", () => {
    const table = render([
      { id: "first", at: 1 },
      { id: "second", at: 1 },
    ]);

    expect(bodyOrder(table)).toEqual(["first", "second"]);

    act(() => {
      table.querySelector<HTMLButtonElement>("th button")?.click();
    });

    expect(bodyOrder(table)).toEqual(["second", "first"]);
  });

  it("leaves a column without a sort value as plain text", () => {
    const table = render([{ id: "only", at: 1 }]);

    expect(table.querySelectorAll("th button")).toHaveLength(1);
  });
});
