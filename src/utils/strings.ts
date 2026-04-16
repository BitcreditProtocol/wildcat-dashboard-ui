export const truncateString = (str: string, maxLength: number): string =>
  str.length <= maxLength ? str : str.slice(0, Math.floor((maxLength - 3) / 2)) + "…" + str.slice(-Math.floor((maxLength - 3) / 2));

export const formatNumber = (locale: string, value: number): string => {
  return new Intl.NumberFormat(locale).format(value);
};

export const getInitials = (name?: string): string => {
  if (!name) {
    return "?";
  }

  return name
    .split(" ")
    .filter((n) => n)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export const getDeterministicColor = (seed?: string): string => {
  if (!seed) {
    return "#999999";
  }

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash % 360);
  const saturation = 65 + (Math.abs(hash) % 20);
  const lightness = 45 + (Math.abs(hash >> 8) % 15);

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

/**
 * Formats a status label for display to users.
 * Converts "OfferExpired" to "Offer Expired" with proper spacing.
 */
export const formatStatusLabel = (status: string): string => {
  if (status === "OfferExpired") {
    return "Offer expired";
  }
  if (status === "MintingEnabled") {
    return "Minting enabled";
  }
  return status;
};
