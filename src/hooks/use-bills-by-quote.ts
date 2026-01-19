import { useQuery } from "@tanstack/react-query"
import { listEbillsOptions } from "@/generated/client/@tanstack/react-query.gen"
import type { BitcreditBill } from "@/generated/client/types.gen"

/**
 * Hook to fetch all bills and provide lookup utilities
 *
 * Note: Currently there's no direct quote -> bill_id link in the API.
 * This hook provides a workaround by fetching all bills and allowing
 * manual matching or filtering.
 */
export function useAllBills() {
  return useQuery({
    ...listEbillsOptions(),
    staleTime: 30_000,
    retry: 1,
    meta: {
      errorMessage: "Failed to fetch bills from /v1/admin/ebill/bills",
    },
  })
}

/**
 * Helper to find a bill by ID from a list of bills
 */
export function findBillById(bills: BitcreditBill[] | undefined, billId: string): BitcreditBill | undefined {
  return bills?.find((bill) => bill.id === billId)
}

/**
 * Helper to filter bills by participant node ID
 */
export function filterBillsByParticipant(bills: BitcreditBill[] | undefined, nodeId: string): BitcreditBill[] {
  if (!bills) {
    return []
  }

  return bills.filter((bill) => bill.participants.all_participant_node_ids.includes(nodeId))
}

/**
 * Helper to get participant display name
 */
export function getParticipantName(participant: { name?: string; node_id: string } | undefined): string {
  if (!participant) return "Unknown"
  return participant.name ?? `Node ${participant.node_id.slice(0, 8)}...`
}
