export const truncateString = (str: string, maxLength: number): string =>
  str.length <= maxLength
    ? str
    : str.slice(0, Math.floor((maxLength - 3) / 2)) + "…" + str.slice(-Math.floor((maxLength - 3) / 2))

export const formatNumber = (locale: string, value: number): string => {
  return new Intl.NumberFormat(locale).format(value)
}
