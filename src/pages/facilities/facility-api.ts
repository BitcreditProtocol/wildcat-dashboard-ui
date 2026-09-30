import {
  facilityApplicationSchema,
  facilityApplicationsResponseSchema,
  type FacilityApplication,
  type FacilityOperatorCommand,
} from "@bitcredit/ai-credit-shared";
import { authenticatedFetch } from "@/lib/api-client";

export const facilityQueryKey = ["ai-credit", "facility-applications"] as const;

export class FacilityRequestError extends Error {
  constructor(public readonly status: number) {
    super(`Facility request failed (${status})`);
  }
}

export async function readFacilityApplications(): Promise<FacilityApplication[]> {
  const response = await authenticatedFetch("/api/ai-credit/facility-applications");
  if (!response.ok) throw new FacilityRequestError(response.status);
  return facilityApplicationsResponseSchema.parse(await response.json()).applications;
}

export async function sendFacilityCommand(command: FacilityOperatorCommand): Promise<FacilityApplication> {
  const response = await authenticatedFetch("/api/ai-credit/facility-operator-command", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(command),
  });
  if (!response.ok) throw new FacilityRequestError(response.status);
  return facilityApplicationSchema.parse(await response.json());
}

/** Slow polling still discovers new applications and externally reopened/expired agreements. */
export function facilityRefetchInterval(applications: FacilityApplication[] | undefined): number {
  if (!applications?.length) return 10_000;
  if (applications.some((application) => application.pending || application.status === "assessing")) return 2_000;
  return applications.some((application) => application.status !== "agreement_accepted" && application.status !== "declined")
    ? 10_000
    : 30_000;
}
