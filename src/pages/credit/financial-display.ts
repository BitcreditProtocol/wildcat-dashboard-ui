import Big from "big.js";

/** Display only: preserve signed minor-unit strings without floating-point conversion. */
export function financialMoney(value: string, currency: string, scale: number): string {
  return `${new Big(value).div(new Big(10).pow(scale)).toFixed(scale)} ${currency}`;
}

export function financialPercent(valueBps: string | number): string {
  return `${new Big(valueBps).div(100).toFixed(2)}%`;
}
