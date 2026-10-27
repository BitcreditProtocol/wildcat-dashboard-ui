import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  billSignerReviewSchema,
  creditPolicyCatalogueSchema,
  facilityOnboardingChecksSchema,
  mintIntelligenceResponseSchema,
  participantDirectoryResponseSchema,
  type BillSignerReview,
  type CreditPolicyCatalogue,
  type FacilityOnboardingChecks,
  type MintIntelligenceCommand,
  type MintIntelligenceResponse,
  type ParticipantDirectoryResponse,
} from "@bitcredit/ai-credit-shared";
import { authenticatedFetch } from "@/lib/api-client";

/**
 * The Mint's read-only operator checks through the authenticated BFF: the Mint-local participant
 * directory, the signer review of a quoted bill, onboarding checks of a facility application, the
 * reviewed credit policy and Mint Intelligence. None of them changes a quote, an application or a
 * decision; only adding an intelligence note writes, and notes are context for people.
 */
export class MintCheckError extends Error {
  constructor(public readonly status: number) {
    super(`Mint check request failed (${status})`);
  }
}

export const mintCheckKeys = {
  directory: (query: string) => ["ai-credit", "participant-directory", query] as const,
  signerReview: (quoteId: string) => ["ai-credit", "bill-signer-review", quoteId] as const,
  /** Bound to the application revision: a profile update must never show the previous revision's checks. */
  onboardingChecks: (applicationId: string, revision: number) =>
    ["ai-credit", "facility-onboarding-checks", applicationId, revision] as const,
  creditPolicy: ["ai-credit", "credit-policy"] as const,
  intelligence: ["ai-credit", "mint-intelligence"] as const,
};

export const DIRECTORY_QUERY_MAX_LENGTH = 200;

async function readJson(path: string, body?: unknown): Promise<unknown> {
  const response = await authenticatedFetch(
    path,
    body === undefined ? undefined : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
  );
  if (!response.ok) throw new MintCheckError(response.status);
  return response.json();
}

export async function searchParticipantDirectory(query: string): Promise<ParticipantDirectoryResponse> {
  const body = { query: query.trim().slice(0, DIRECTORY_QUERY_MAX_LENGTH) };
  return participantDirectoryResponseSchema.parse(await readJson("/api/ai-credit/participant-directory", body));
}

export async function readBillSignerReview(quoteId: string): Promise<BillSignerReview> {
  return billSignerReviewSchema.parse(await readJson("/api/ai-credit/bill-signer-review", { quoteId }));
}

export async function readFacilityOnboardingChecks(applicationId: string): Promise<FacilityOnboardingChecks> {
  return facilityOnboardingChecksSchema.parse(await readJson("/api/ai-credit/facility-onboarding-checks", { applicationId }));
}

export async function readCreditPolicy(): Promise<CreditPolicyCatalogue> {
  return creditPolicyCatalogueSchema.parse(await readJson("/api/ai-credit/credit-policy"));
}

export async function readMintIntelligence(): Promise<MintIntelligenceResponse> {
  return mintIntelligenceResponseSchema.parse(await readJson("/api/ai-credit/mint-intelligence"));
}

export async function addMintIntelligenceNote(command: MintIntelligenceCommand): Promise<MintIntelligenceResponse> {
  return mintIntelligenceResponseSchema.parse(await readJson("/api/ai-credit/mint-intelligence", command));
}

// Computed on request and never status-bearing, so no polling: the operator refreshes or retries.
export function useParticipantDirectory(query: string) {
  const normalized = query.trim().slice(0, DIRECTORY_QUERY_MAX_LENGTH);
  return useQuery({
    queryKey: mintCheckKeys.directory(normalized),
    queryFn: () => searchParticipantDirectory(normalized),
    // Keep the last results on screen while the next keystroke's search runs.
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: false,
  });
}

export function useBillSignerReview(quoteId: string | undefined) {
  return useQuery({
    queryKey: mintCheckKeys.signerReview(quoteId ?? ""),
    queryFn: () => readBillSignerReview(quoteId ?? ""),
    enabled: quoteId !== undefined,
    staleTime: 30_000,
    retry: false,
  });
}

export function useFacilityOnboardingChecks(applicationId: string, revision: number) {
  return useQuery({
    queryKey: mintCheckKeys.onboardingChecks(applicationId, revision),
    queryFn: () => readFacilityOnboardingChecks(applicationId),
    staleTime: 30_000,
    retry: false,
  });
}

export function useCreditPolicy() {
  return useQuery({ queryKey: mintCheckKeys.creditPolicy, queryFn: readCreditPolicy, staleTime: 300_000, retry: false });
}

export function useMintIntelligence() {
  return useQuery({ queryKey: mintCheckKeys.intelligence, queryFn: readMintIntelligence, staleTime: 60_000, retry: false });
}

export function useAddMintIntelligenceNote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: addMintIntelligenceNote,
    // An older read still in flight must not overwrite the saved revision: cancel it, install the
    // write's response, then reconcile with a fresh read.
    onSuccess: async (response) => {
      await client.cancelQueries({ queryKey: mintCheckKeys.intelligence });
      client.setQueryData(mintCheckKeys.intelligence, response);
      void client.invalidateQueries({ queryKey: mintCheckKeys.intelligence });
    },
  });
}
