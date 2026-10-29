import { useIntl } from "react-intl";

/** Relative age, coarse on purpose: "4 min", "2 h", "3 d". */
export function useAge() {
  const intl = useIntl();
  return (at: string) => {
    const minutes = Math.max(0, (Date.now() - Date.parse(at)) / 60_000);
    const [value, unit] = minutes < 60 ? [minutes, "minute"] : minutes < 1440 ? [minutes / 60, "hour"] : [minutes / 1440, "day"];
    return intl.formatNumber(Math.max(1, Math.floor(value)), { style: "unit", unit, unitDisplay: "narrow" });
  };
}
