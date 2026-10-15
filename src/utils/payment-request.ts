import type { BillHistoryBlock } from "@/generated/client/types.gen";

export interface HistoryPaymentRequest {
  paymentAddress: string;
  sum: string;
  currency: string;
  requestedAt: number;
  deadline: number | null;
}

export function latestPaymentRequest(blocks: BillHistoryBlock[] | undefined): HistoryPaymentRequest | null {
  const block = (blocks ?? [])
    .filter((candidate) => candidate.block_type === "RequestToPay" && candidate.payment_data)
    .reduce<BillHistoryBlock | null>(
      (latest, candidate) => (latest === null || candidate.block_id > latest.block_id ? candidate : latest),
      null
    );

  if (!block?.payment_data) {
    return null;
  }

  return {
    paymentAddress: block.payment_data.payment_address,
    sum: block.payment_data.sum,
    currency: block.payment_data.currency,
    requestedAt: block.signing_timestamp,
    deadline: block.request_deadline ?? null,
  };
}

export function hasRejectedToPay(blocks: BillHistoryBlock[] | undefined): boolean {
  return (blocks ?? []).some((block) => block.block_type === "RejectToPay");
}
