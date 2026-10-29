import { type ReactNode, useMemo, useState } from "react";
import { cn } from "@bitcredit/ui-library";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { FormattedMessage } from "react-intl";
import { CHART_BODY_CLASS } from "./HistoryChartCard";

export interface HistoryTableColumn<Row> {
  key: string;
  header: ReactNode;
  cell: (row: Row) => ReactNode;
  numeric?: boolean;
  truncate?: boolean;
  sortValue?: (row: Row) => number | string;
  className?: string;
}

export type SortDirection = "asc" | "desc";

export interface HistoryTableSort {
  key: string;
  direction: SortDirection;
}

/**
 * A row under the data that says what the rows add up to. `label` takes the first column;
 * `cells` fills other columns by key and leaves the rest blank.
 */
export interface HistoryTableSummary {
  key: string;
  label: ReactNode;
  cells: Partial<Record<string, ReactNode>>;
}

export function TotalLabel() {
  return <FormattedMessage id="balances.history.table.total" defaultMessage="Total" />;
}

interface HistoryTableProps<Row> {
  columns: HistoryTableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  summary?: HistoryTableSummary[];
  defaultSort?: HistoryTableSort;
}

function compareValues(a: number | string, b: number | string): number {
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }

  return String(a).localeCompare(String(b));
}

function sortRows<Row>(rows: Row[], columns: HistoryTableColumn<Row>[], sort: HistoryTableSort | undefined): Row[] {
  const sortValue = columns.find((column) => column.key === sort?.key)?.sortValue;

  if (!sort || !sortValue) {
    return rows;
  }

  const sign = sort.direction === "asc" ? 1 : -1;

  return rows
    .map((row, index) => ({ row, index, value: sortValue(row) }))
    .sort((a, b) => sign * (compareValues(a.value, b.value) || a.index - b.index))
    .map(({ row }) => row);
}

function SortIcon({ direction }: { direction: SortDirection | undefined }) {
  const Icon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ArrowUpDown;

  return <Icon className={cn("size-3.5 shrink-0", direction === undefined && "opacity-40")} aria-hidden />;
}

const ROW_CLASS = "col-span-full grid grid-cols-subgrid";

/**
 * `auto` tracks share the spare width evenly, so the columns spread from edge to edge; a
 * truncating column may also shrink below its content when there is no spare width at all.
 */
function gridTemplate<Row>(columns: HistoryTableColumn<Row>[]): string {
  return columns.map((column) => (column.truncate ? "minmax(0, auto)" : "auto")).join(" ");
}

/**
 * A chart's data as rows. It takes the chart's height and scrolls between a sticky header and a
 * sticky summary, so the totals stay in view however long the list runs.
 *
 * It is a grid rather than table layout so the spare width is spread evenly over every column,
 * where a table would hand it all to the truncating one and open a gap between an id and its
 * amounts. Rows are subgrids, which keeps them on the shared column tracks.
 */
export function HistoryTable<Row>({ columns, rows, rowKey, summary = [], defaultSort }: HistoryTableProps<Row>) {
  const [sort, setSort] = useState(defaultSort);
  const sortedRows = useMemo(() => sortRows(rows, columns, sort), [columns, rows, sort]);

  const toggleSort = (key: string) =>
    setSort((current) => ({ key, direction: current?.key === key && current.direction === "asc" ? "desc" : "asc" }));

  return (
    <div className={cn(CHART_BODY_CLASS, "overflow-auto rounded-lg border")}>
      <table className="grid w-full min-w-xl text-sm" style={{ gridTemplateColumns: gridTemplate(columns) }}>
        <thead className={cn(ROW_CLASS, "sticky top-0 z-10 border-b bg-elevation-50")}>
          <tr className={ROW_CLASS}>
            {columns.map((column) => {
              const direction = sort?.key === column.key ? sort.direction : undefined;

              return (
                <th
                  key={column.key}
                  aria-sort={direction === "asc" ? "ascending" : direction === "desc" ? "descending" : undefined}
                  className={cn("p-3 font-semibold whitespace-nowrap", column.numeric ? "text-right" : "text-left")}
                >
                  {column.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className={cn("inline-flex items-center gap-1 hover:underline", column.numeric && "flex-row-reverse")}
                    >
                      {column.header}
                      <SortIcon direction={direction} />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className={ROW_CLASS}>
          {sortedRows.map((row) => (
            <tr key={rowKey(row)} className={cn(ROW_CLASS, "border-b last:border-b-0")}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    "p-3 whitespace-nowrap",
                    column.numeric && "text-right tabular-nums",
                    column.truncate && "min-w-0",
                    column.className
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {summary.length > 0 ? (
          <tfoot className={cn(ROW_CLASS, "sticky bottom-0 border-t-2 bg-elevation-50 font-semibold")}>
            {summary.map((line) => (
              <tr key={line.key} className={ROW_CLASS}>
                {columns.map((column, index) => (
                  <td key={column.key} className={cn("p-3 whitespace-nowrap", column.numeric && "text-right tabular-nums")}>
                    {index === 0 ? line.label : line.cells[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}
