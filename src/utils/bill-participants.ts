import type {
  BillAnonParticipant,
  BillIdentParticipant,
  BillParticipant,
  LightBillAnonParticipant,
  LightBillIdentParticipantWithAddress,
  LightBillParticipant,
  PostalAddress,
} from "@/generated/client/types.gen";

export type AnyParticipant = BillParticipant | LightBillParticipant | BillIdentParticipant;
export type IdentifiedParticipant = BillIdentParticipant | LightBillIdentParticipantWithAddress;
export type AnonymousParticipant = BillAnonParticipant | LightBillAnonParticipant;

export function unwrapParticipant(participant?: AnyParticipant | null): IdentifiedParticipant | AnonymousParticipant | null {
  if (!participant) {
    return null;
  }
  if ("Ident" in participant) {
    return participant.Ident;
  }
  if ("Anon" in participant) {
    return participant.Anon;
  }
  return participant;
}

export function isIdentified(participant: IdentifiedParticipant | AnonymousParticipant): participant is IdentifiedParticipant {
  return "name" in participant;
}

export function participantLabel(participant: IdentifiedParticipant | AnonymousParticipant | null, fallback: string): string {
  if (!participant) {
    return fallback;
  }
  return isIdentified(participant) ? participant.name : participant.node_id;
}

export function formatAddress(address: PostalAddress): string {
  return [address.address, address.zip, address.city, address.country].filter(Boolean).join(", ");
}

/** The reader's name for a country stated as an ISO region code; anything else is shown as stated. */
export function countryName(country: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(country.toUpperCase()) ?? country;
  } catch {
    return country; // Not a region code: a party may have typed the country out.
  }
}

/** A postal address as the party stated it, with the country named for the reader. */
export function statedAddress(address: PostalAddress, locale: string): string {
  return formatAddress({ ...address, country: address.country === "" ? "" : countryName(address.country, locale) });
}
