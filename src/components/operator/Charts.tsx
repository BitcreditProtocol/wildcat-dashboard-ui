import { useId } from "react";

export interface BarDatum {
  id: string;
  label: string;
  value: number;
  display: string;
  detail?: string;
  attention?: boolean;
}
/** Label + number + bar: colour supplements the data, and zero remains visibly zero. */
export function HorizontalBars({
  title,
  data,
  maximum,
  axisLabel,
}: {
  title: string;
  data: BarDatum[];
  maximum?: number;
  axisLabel: string;
}) {
  const max = maximum ?? Math.max(1, ...data.map((item) => item.value));
  return (
    <figure aria-label={title} className="space-y-3">
      <figcaption className="font-medium text-sm">{title}</figcaption>
      <ul className="max-h-64 space-y-3 overflow-y-auto">
        {data.map((item) => (
          <li key={item.id} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="min-w-0 break-words">{item.label}</span>
              <span className="shrink-0 font-medium tabular-nums">{item.display}</span>
            </div>
            <div aria-hidden="true" className="h-2 overflow-hidden rounded-sm bg-muted">
              <div
                className={`h-full rounded-sm ${item.attention ? "bg-amber-600 dark:bg-amber-400" : "bg-sky-700 dark:bg-sky-400"}`}
                style={{ width: `${Math.max(0, Math.min(100, (item.value / max) * 100))}%` }}
              />
            </div>
            {item.detail && <p className="text-[11px] text-muted-foreground">{item.detail}</p>}
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground">{axisLabel}</p>
    </figure>
  );
}
export function MaturityChart({
  title,
  labels,
  values,
  displays,
  axisLabel,
}: {
  title: string;
  labels: string[];
  values: number[];
  displays: string[];
  axisLabel: string;
}) {
  const id = useId();
  const maximum = Math.max(1, ...values);
  const plotHeight = 112;
  return (
    <figure aria-labelledby={id} className="space-y-2">
      <figcaption id={id} className="text-sm font-medium">
        {title}
      </figcaption>
      <svg
        viewBox="0 0 420 180"
        className="w-full h-44"
        role="img"
        aria-label={`${title}. ${labels.map((label, i) => `${label}: ${displays[i] ?? "0"}`).join("; ")}`}
      >
        {[0, 0.5, 1].map((ratio) => (
          <line
            key={ratio}
            x1="22"
            x2="408"
            y1={130 - ratio * plotHeight}
            y2={130 - ratio * plotHeight}
            className="stroke-border"
            strokeDasharray={ratio === 0 ? undefined : "3 4"}
          />
        ))}
        {values.map((value, i) => (
          <g key={labels[i]}>
            <rect
              x={42 + i * 130}
              y={130 - (value / maximum) * plotHeight}
              width="88"
              height={(value / maximum) * plotHeight}
              rx="3"
              className="fill-sky-700 dark:fill-sky-400"
            />
            <text
              x={86 + i * 130}
              y={Math.max(13, 120 - (value / maximum) * plotHeight)}
              textAnchor="middle"
              className="fill-foreground text-[11px]"
            >
              {displays[i]}
            </text>
            <text x={86 + i * 130} y="151" textAnchor="middle" className="fill-muted-foreground text-[11px]">
              {labels[i]}
            </text>
          </g>
        ))}
      </svg>
      <p className="text-[11px] text-muted-foreground">{axisLabel}</p>
    </figure>
  );
}
export function CapacityMeter({
  label,
  used,
  limit,
  value,
  status,
}: {
  label: string;
  used: number;
  limit: number;
  value: string;
  status: "ok" | "warning" | "full";
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between gap-3 text-xs">
        <span>{label}</span>
        <strong className="tabular-nums">{value}</strong>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.max(limit, used, 1)}
        aria-valuenow={used}
        aria-valuetext={value}
        className="h-2 overflow-hidden rounded-sm bg-muted"
      >
        <div
          className={`h-full ${status === "ok" ? "bg-sky-700 dark:bg-sky-400" : "bg-amber-600 dark:bg-amber-400"}`}
          style={{ width: `${limit <= 0 ? 100 : Math.min(100, (used / limit) * 100)}%` }}
        />
      </div>
    </div>
  );
}
