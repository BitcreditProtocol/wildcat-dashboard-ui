import type { DirectoryPostalAddress, ParticipantSource } from "@bitcredit/ai-credit-shared";
import { countryName } from "@/utils/bill-participants";

export function formatDirectoryAddress(address: DirectoryPostalAddress, locale: string): string {
  const country = address.country.trim() === "" ? "" : countryName(address.country, locale);
  return [address.address, address.zip, address.city, country].filter((part) => part?.trim()).join(", ");
}

export function directoryLink(name: string): string {
  return `/directory?${new URLSearchParams({ q: name }).toString()}`;
}

export function sourceKey(source: ParticipantSource): string {
  return source.type === "bill_party" ? `quote:${source.quoteId}` : `application:${source.applicationId}:${source.role}`;
}
