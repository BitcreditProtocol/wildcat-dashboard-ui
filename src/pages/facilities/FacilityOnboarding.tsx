import type {
  CompanyMasterData,
  EmailVerification,
  FacilityApplication,
  FacilityOnboardingChecks,
  FacilityRequest,
  SignerMasterData,
} from "@bitcredit/ai-credit-shared";
import { Button } from "@bitcredit/ui-library";
import { Info } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { useIntl } from "react-intl";
import { defineMessages } from "@/i18n/define-messages";
import { useFacilityOnboardingChecks } from "@/pages/mint-checks/api";
import { formatDirectoryAddress, sourceKey } from "@/pages/mint-checks/mint-check-format";
import {
  applicantIdentityMessages,
  emailVerificationMessages,
  masterDataFieldMessages,
  mintCheckMessages,
} from "@/pages/mint-checks/mint-checks-copy";
import {
  CheckLoading,
  CheckUnavailable,
  ParticipantMatchList,
  ParticipantSourceItem,
  ReviewSignalLabel,
} from "@/pages/mint-checks/MintCheckParts";

const messages = defineMessages({
  requestTitle: { id: "facilities.request.title", defaultMessage: "Request", description: "What the applicant asked for" },
  requestProvenance: {
    id: "facilities.request.provenance",
    defaultMessage: "The applicant’s statement, not terms. The operator still sets every term.",
    description: "A facility request is never an allowance or agreed term",
  },
  product: { id: "facilities.request.product", defaultMessage: "Product", description: "Requested Mint product" },
  amount: {
    id: "facilities.request.amount",
    defaultMessage: "Typical eBill amount",
    description: "The applicant's typical eBill size in sat",
  },
  tenor: {
    id: "facilities.request.tenor",
    defaultMessage: "Usual time until payment",
    description: "The applicant's usual days from issue to maturity",
  },
  days: { id: "facilities.request.days", defaultMessage: "{days, plural, one {# day} other {# days}}", description: "Days until payment" },
  purpose: { id: "facilities.request.purpose", defaultMessage: "Purpose", description: "Stated purpose of the facility" },
  unknown: { id: "facilities.request.unknown", defaultMessage: "Not known yet", description: "The applicant did not know this yet" },
  minting: { id: "facilities.product.minting", defaultMessage: "Minting", description: "Mint product" },
  drawing: { id: "facilities.product.drawing", defaultMessage: "Drawing", description: "Mint product" },
  advancing: { id: "facilities.product.advancing", defaultMessage: "Advancing", description: "Mint product" },
  checksTitle: {
    id: "facilities.checks.title",
    defaultMessage: "Onboarding checks",
    description: "This Mint's deterministic checks of the application's declared data and its own records",
  },
  checksIntro: {
    id: "facilities.checks.intro",
    defaultMessage:
      "Computed by this Mint from the applicant’s declared eBill profile and its own records. Informational only: nothing here changes the application or its decision.",
    description: "Onboarding checks neither decide nor gate",
  },
  masterData: { id: "facilities.checks.masterData", defaultMessage: "Master data", description: "Declared signer and company data" },
  masterDataDeclared: {
    id: "facilities.checks.declared",
    defaultMessage: "Declared by the applicant’s eBill profile; not verified by the Mint except a Mint-signed email proof.",
    description: "Provenance of master data values",
  },
  noMasterData: {
    id: "facilities.checks.noMasterData",
    defaultMessage: "The applicant shared no master data with this application.",
    description: "Applications before consent v3 carry no master data",
  },
  complete: { id: "facilities.checks.complete", defaultMessage: "Complete", description: "All declared master data fields are present" },
  missing: { id: "facilities.checks.missing", defaultMessage: "Missing: {fields}", description: "Master data fields not declared" },
  dateOfBirth: { id: "facilities.checks.dateOfBirth", defaultMessage: "Date of birth", description: "Declared value label" },
  placeOfBirth: { id: "facilities.checks.placeOfBirth", defaultMessage: "Place of birth", description: "Declared value label" },
  identificationNumber: {
    id: "facilities.checks.identificationNumber",
    defaultMessage: "Identification number",
    description: "Declared value label",
  },
  show: { id: "facilities.checks.show", defaultMessage: "Show", description: "Reveal the masked identification number" },
  hide: { id: "facilities.checks.hide", defaultMessage: "Hide", description: "Mask the identification number again" },
  revealLabel: {
    id: "facilities.checks.revealLabel",
    defaultMessage: "Show identification number",
    description: "Accessible label of the reveal toggle",
  },
  identityDocument: { id: "facilities.checks.identityDocument", defaultMessage: "Identity document", description: "Declared value label" },
  provided: { id: "facilities.checks.provided", defaultMessage: "Provided", description: "A document was shared" },
  notProvided: { id: "facilities.checks.notProvided", defaultMessage: "Not provided", description: "No document was shared" },
  address: { id: "facilities.checks.address", defaultMessage: "Postal address", description: "Declared value label" },
  email: { id: "facilities.checks.email", defaultMessage: "Email", description: "Declared value label" },
  placeOfRegistration: {
    id: "facilities.checks.placeOfRegistration",
    defaultMessage: "Place of registration",
    description: "Declared value label",
  },
  registrationNumber: {
    id: "facilities.checks.registrationNumber",
    defaultMessage: "Registration number",
    description: "Declared value label",
  },
  registrationDate: { id: "facilities.checks.registrationDate", defaultMessage: "Registration date", description: "Declared value label" },
  proofOfRegistration: {
    id: "facilities.checks.proofOfRegistration",
    defaultMessage: "Proof of registration",
    description: "Declared value label",
  },
  signatories: {
    id: "facilities.checks.signatories",
    defaultMessage: "{count, plural, one {# recorded signatory} other {# recorded signatories}}",
    description: "Number of signatories in the company's chain",
  },
  duplicates: {
    id: "facilities.checks.duplicates",
    defaultMessage: "Possible duplicates in this Mint’s directory",
    description: "Heading of directory participants that look like the applicant's identities",
  },
  history: { id: "facilities.checks.history", defaultMessage: "History at this Mint", description: "Earlier quotes and applications" },
  historyTruncated: {
    id: "facilities.checks.historyTruncated",
    defaultMessage: "Older entries are not shown; this history is incomplete.",
    description: "The Mint-local directory dropped history beyond its bounds",
  },
  noHistory: {
    id: "facilities.checks.noHistory",
    defaultMessage: "No other quotes or applications at this Mint name these identities.",
    description: "No earlier history at this Mint",
  },
  notDeclared: { id: "facilities.checks.notDeclared", defaultMessage: "—", description: "A declared value is empty" },
});

const emailTone: Record<EmailVerification, string> = {
  confirmed_by_this_mint: "text-signal-success",
  confirmed_by_other_witness: "text-muted-foreground",
  self_signed: "text-muted-foreground",
  proof_for_other_email: "text-signal-alert",
  unconfirmed: "text-muted-foreground",
  proof_invalid: "text-signal-alert",
};

export function FacilityRequestSection({ request }: { request: FacilityRequest }) {
  const intl = useIntl();
  const titleId = useId();
  return (
    <section aria-labelledby={titleId}>
      <h3 id={titleId} className="text-sm font-medium">
        {intl.formatMessage(messages.requestTitle)}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">{intl.formatMessage(messages.requestProvenance)}</p>
      <dl className="mt-3 grid gap-px overflow-hidden rounded-lg border border-border bg-border @xl:grid-cols-3">
        <div className="bg-card p-4">
          <dt className="text-xs text-muted-foreground">{intl.formatMessage(messages.product)}</dt>
          <dd className="mt-1.5 text-sm">{intl.formatMessage(messages[request.product])}</dd>
        </div>
        <div className="bg-card p-4">
          <dt className="text-xs text-muted-foreground">{intl.formatMessage(messages.amount)}</dt>
          <dd className="mt-1.5 text-sm tabular-nums">
            {request.amountSat === null
              ? intl.formatMessage(messages.unknown)
              : `${new Intl.NumberFormat(intl.locale).format(BigInt(request.amountSat))} sat`}
          </dd>
        </div>
        <div className="bg-card p-4">
          <dt className="text-xs text-muted-foreground">{intl.formatMessage(messages.tenor)}</dt>
          <dd className="mt-1.5 text-sm">
            {request.tenorDays === null
              ? intl.formatMessage(messages.unknown)
              : intl.formatMessage(messages.days, { days: request.tenorDays })}
          </dd>
        </div>
        <div className="bg-card p-4 @xl:col-span-3">
          <dt className="text-xs text-muted-foreground">{intl.formatMessage(messages.purpose)}</dt>
          <dd className="mt-1.5 whitespace-pre-wrap text-sm">{request.purpose}</dd>
        </div>
      </dl>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm">{children}</dd>
    </div>
  );
}

function MaskedValue({ value }: { value: string }) {
  const intl = useIntl();
  const [revealed, setRevealed] = useState(false);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="font-mono">{revealed ? value : "••••••••"}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-pressed={revealed}
        aria-label={intl.formatMessage(messages.revealLabel)}
        onClick={() => setRevealed((value) => !value)}
      >
        {intl.formatMessage(revealed ? messages.hide : messages.show)}
      </Button>
    </span>
  );
}

function CompletenessLine({ status, missing, email }: { status: "complete" | "incomplete"; missing: string[]; email: EmailVerification }) {
  const intl = useIntl();
  return (
    <div className="space-y-1 text-xs">
      <p className={status === "incomplete" ? "text-signal-alert" : "text-muted-foreground"}>
        {status === "complete"
          ? intl.formatMessage(messages.complete)
          : intl.formatMessage(messages.missing, { fields: intl.formatList(missing, { type: "conjunction" }) })}
      </p>
      <p className={emailTone[email]}>{intl.formatMessage(emailVerificationMessages[email])}</p>
    </div>
  );
}

function SignerCard({
  signer,
  checks,
}: {
  signer: SignerMasterData;
  checks: NonNullable<FacilityOnboardingChecks["masterData"]>["signer"];
}) {
  const intl = useIntl();
  const dash = intl.formatMessage(messages.notDeclared);
  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h5 className="text-sm font-medium">{intl.formatMessage(applicantIdentityMessages.signer)}</h5>
        <span className="text-sm">{signer.name}</span>
      </div>
      <CompletenessLine
        status={checks.status}
        missing={checks.missing.map((field) => intl.formatMessage(masterDataFieldMessages[field]))}
        email={checks.emailVerification}
      />
      <dl className="grid gap-3 @lg:grid-cols-2">
        <Field label={intl.formatMessage(messages.email)}>{signer.email ?? dash}</Field>
        <Field label={intl.formatMessage(messages.address)}>
          {signer.postalAddress ? formatDirectoryAddress(signer.postalAddress, intl.locale) : dash}
        </Field>
        <Field label={intl.formatMessage(messages.dateOfBirth)}>
          {signer.dateOfBirth ? intl.formatDate(signer.dateOfBirth, { dateStyle: "medium", timeZone: "UTC" }) : dash}
        </Field>
        <Field label={intl.formatMessage(messages.placeOfBirth)}>
          {[signer.cityOfBirth, signer.countryOfBirth].filter(Boolean).join(", ") || dash}
        </Field>
        <Field label={intl.formatMessage(messages.identificationNumber)}>
          {signer.identificationNumber ? <MaskedValue value={signer.identificationNumber} /> : dash}
        </Field>
        <Field label={intl.formatMessage(messages.identityDocument)}>
          {intl.formatMessage(signer.identityDocumentProvided ? messages.provided : messages.notProvided)}
        </Field>
      </dl>
    </section>
  );
}

function CompanyCard({
  company,
  checks,
}: {
  company: CompanyMasterData;
  checks: NonNullable<NonNullable<FacilityOnboardingChecks["masterData"]>["company"]>;
}) {
  const intl = useIntl();
  const dash = intl.formatMessage(messages.notDeclared);
  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h5 className="text-sm font-medium">{intl.formatMessage(applicantIdentityMessages.company)}</h5>
        <span className="text-sm">{company.name}</span>
      </div>
      <CompletenessLine
        status={checks.status}
        missing={checks.missing.map((field) => intl.formatMessage(masterDataFieldMessages[field]))}
        email={checks.emailVerification}
      />
      <dl className="grid gap-3 @lg:grid-cols-2">
        <Field label={intl.formatMessage(messages.email)}>{company.email ?? dash}</Field>
        <Field label={intl.formatMessage(messages.address)}>
          {company.postalAddress ? formatDirectoryAddress(company.postalAddress, intl.locale) : dash}
        </Field>
        <Field label={intl.formatMessage(messages.placeOfRegistration)}>
          {[company.cityOfRegistration, company.countryOfRegistration].filter(Boolean).join(", ") || dash}
        </Field>
        <Field label={intl.formatMessage(messages.registrationNumber)}>{company.registrationNumber ?? dash}</Field>
        <Field label={intl.formatMessage(messages.registrationDate)}>
          {company.registrationDate ? intl.formatDate(company.registrationDate, { dateStyle: "medium", timeZone: "UTC" }) : dash}
        </Field>
        <Field label={intl.formatMessage(messages.proofOfRegistration)}>
          {intl.formatMessage(company.proofOfRegistrationProvided ? messages.provided : messages.notProvided)}
        </Field>
      </dl>
      <p className="text-xs text-muted-foreground">{intl.formatMessage(messages.signatories, { count: company.signatoryRefs.length })}</p>
    </section>
  );
}

export function FacilityOnboardingChecksView({
  application,
  checks,
}: {
  application: FacilityApplication;
  checks: FacilityOnboardingChecks;
}) {
  const intl = useIntl();
  const declared = application.masterData;
  const duplicates = checks.directory.matches.filter((entry) => entry.matches.length > 0);
  const history = checks.historyAtMint
    .map((entry) => ({
      ...entry,
      // The current application is not history of itself.
      sources: entry.sources.filter((source) => source.type !== "facility_applicant" || source.applicationId !== application.id),
    }))
    .filter((entry) => entry.sources.length > 0);
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-medium">{intl.formatMessage(messages.masterData)}</h4>
          <p className="mt-1 text-xs text-muted-foreground">{intl.formatMessage(messages.masterDataDeclared)}</p>
        </div>
        {checks.masterData === null || declared === null ? (
          <p className="text-sm text-muted-foreground">{intl.formatMessage(messages.noMasterData)}</p>
        ) : (
          <div className="grid gap-3 @3xl:grid-cols-2">
            <SignerCard signer={declared.signer} checks={checks.masterData.signer} />
            {declared.company && checks.masterData.company && <CompanyCard company={declared.company} checks={checks.masterData.company} />}
          </div>
        )}
      </div>
      <div className="space-y-3">
        <h4 className="flex flex-wrap items-center gap-2 text-sm font-medium">
          {intl.formatMessage(messages.duplicates)}
          <ReviewSignalLabel />
        </h4>
        {!checks.directory.complete && (
          <p role="status" className="flex items-start gap-2 rounded-lg border border-border bg-muted p-3 text-sm">
            <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            {intl.formatMessage(mintCheckMessages.directoryIncomplete)}
          </p>
        )}
        {duplicates.length === 0 ? (
          <p className="text-sm text-muted-foreground">{intl.formatMessage(mintCheckMessages.noMatches)}</p>
        ) : (
          duplicates.map((entry) => (
            <div key={`${entry.role}-${entry.ref}`} className="space-y-2">
              <p className="text-xs text-muted-foreground">{intl.formatMessage(applicantIdentityMessages[entry.role])}</p>
              <ParticipantMatchList matches={entry.matches} />
            </div>
          ))
        )}
      </div>
      <div className="space-y-3">
        <h4 className="text-sm font-medium">{intl.formatMessage(messages.history)}</h4>
        {checks.historyAtMint.some((entry) => entry.truncated) && (
          <p role="status" className="text-xs text-muted-foreground">
            {intl.formatMessage(messages.historyTruncated)}
          </p>
        )}
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">{intl.formatMessage(messages.noHistory)}</p>
        ) : (
          history.map((entry) => (
            <div key={`${entry.role}-${entry.ref}`}>
              <p className="text-xs text-muted-foreground">{intl.formatMessage(applicantIdentityMessages[entry.role])}</p>
              <ul className="mt-1 space-y-1 text-sm">
                {entry.sources.map((source) => (
                  <li key={sourceKey(source)}>
                    <ParticipantSourceItem source={source} />
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function FacilityOnboardingChecksSection({ application }: { application: FacilityApplication }) {
  const intl = useIntl();
  const titleId = useId();
  const query = useFacilityOnboardingChecks(application.id, application.revision);
  return (
    <section aria-labelledby={titleId} className="@container space-y-4 rounded-lg border border-border bg-card p-5 md:p-6">
      <div>
        <h3 id={titleId} className="font-medium">
          {intl.formatMessage(messages.checksTitle)}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{intl.formatMessage(messages.checksIntro)}</p>
      </div>
      {query.error ? (
        <CheckUnavailable error={query.error} retrying={query.isFetching} onRetry={() => void query.refetch()} />
      ) : query.data ? (
        <FacilityOnboardingChecksView application={application} checks={query.data} />
      ) : (
        <CheckLoading />
      )}
    </section>
  );
}
