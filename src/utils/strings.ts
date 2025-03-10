export const truncateString = (str: string, maxLength: number): string =>
  str.length <= maxLength
    ? str
    : str.slice(0, Math.floor((maxLength - 3) / 2)) + "…" + str.slice(-Math.floor((maxLength - 3) / 2))
