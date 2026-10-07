import type { ReactNode } from "react";
import { cn } from "@bitcredit/ui-library";
import { FormattedMessage } from "react-intl";
import { CHART_BODY_CLASS } from "./HistoryChartCard";

export interface HistoryTableColumn<Row> {
  key: string;
  header: ReactNode;
  cell: (row: Row) => ReactNode;
  numeric?: boolean;
  /**
   * The column gives up width first when the drawer is too narrow, cutting its text to fit, so a
   * long id shortens instead of pushing the amounts off screen.
   */
  truncate?: boolean;
  className?: string;
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
export function HistoryTable<Row>({ columns, rows, rowKey, summary = [] }: HistoryTableProps<Row>) {
  return (
    <div className={cn(CHART_BODY_CLASS, "overflow-auto rounded-lg border")}>
      <table className="grid w-full text-sm" style={{ gridTemplateColumns: gridTemplate(columns) }}>
        <thead className={cn(ROW_CLASS, "sticky top-0 border-b bg-elevation-50")}>
          <tr className={ROW_CLASS}>
            {columns.map((column) => (
              <th key={column.key} className={cn("p-3 font-semibold whitespace-nowrap", column.numeric ? "text-right" : "text-left")}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={ROW_CLASS}>
          {rows.map((row) => (
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
