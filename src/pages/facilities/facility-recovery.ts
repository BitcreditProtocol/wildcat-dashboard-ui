import { facilityOperatorCommandSchema, type FacilityApplication, type FacilityOperatorCommand } from "@bitcredit/ai-credit-shared";
import keycloak from "@/keycloak";

type ReassessmentCommand = Extract<FacilityOperatorCommand, { action: "reassess" }>;
interface RecoveryBinding {
  id: string;
  expectedRevision: number;
  submissionDigest: string;
}

export class FacilityRecoveryError extends Error {
  constructor() {
    super("Assessment recovery could not be saved. No request was sent.");
  }
}

/** Only stable authenticated identity is used, never the bearer token or profile data. */
export function facilityOperatorScope(): string | undefined {
  const subject = keycloak.subject;
  const issuer = keycloak.tokenParsed?.iss;
  return keycloak.authenticated && subject && typeof issuer === "string" ? JSON.stringify([issuer, subject]) : undefined;
}

function recoveryKey(scope: string, binding: RecoveryBinding): string {
  return `facility-reassess-v1:${encodeURIComponent(scope)}:${binding.id}:${binding.expectedRevision}:${binding.submissionDigest}`;
}

function readCommand(scope: string, binding: RecoveryBinding): ReassessmentCommand | undefined {
  const stored = sessionStorage.getItem(recoveryKey(scope, binding));
  if (!stored) return undefined;
  const parsed = facilityOperatorCommandSchema.safeParse(JSON.parse(stored));
  if (
    !parsed.success ||
    parsed.data.action !== "reassess" ||
    parsed.data.id !== binding.id ||
    parsed.data.expectedRevision !== binding.expectedRevision ||
    parsed.data.submissionDigest !== binding.submissionDigest
  )
    return undefined;
  return parsed.data;
}

export function pendingReassessment(
  scope: string | undefined,
  application: FacilityApplication | undefined
): ReassessmentCommand | undefined {
  const submission = application?.submissions[application.submissions.length - 1];
  if (!scope || !application || !submission) return undefined;
  try {
    return readCommand(scope, { id: application.id, expectedRevision: application.revision, submissionDigest: submission.digest });
  } catch {
    return undefined;
  }
}

export function saveReassessment(scope: string | undefined, command: ReassessmentCommand): void {
  if (!scope) throw new FacilityRecoveryError();
  try {
    const existing = readCommand(scope, command);
    if (existing && JSON.stringify(existing) !== JSON.stringify(command)) throw new FacilityRecoveryError();
    const value = JSON.stringify(command);
    sessionStorage.setItem(recoveryKey(scope, command), value);
    if (sessionStorage.getItem(recoveryKey(scope, command)) !== value) throw new FacilityRecoveryError();
  } catch {
    throw new FacilityRecoveryError();
  }
}

/** Only a confirmed successful response retires the recovery record; HTTP400 can be a model failure. */
export function finishReassessment(scope: string | undefined, command: ReassessmentCommand): void {
  if (!scope) return;
  try {
    sessionStorage.removeItem(recoveryKey(scope, command));
  } catch {
    /* A retained record cannot issue a new command or bypass a revision check. */
  }
}
