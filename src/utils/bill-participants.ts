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
