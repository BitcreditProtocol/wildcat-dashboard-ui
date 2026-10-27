import type { BillSignerParty, BillSignerReview } from "@bitcredit/ai-credit-shared";
import { Button } from "@bitcredit/ui-library";
import { CircleAlert, Info } from "lucide-react";
import { useId } from "react";
import { defineMessages, useIntl } from "react-intl";
import { useBillSignerReview } from "@/pages/mint-checks/api";
import {
  billRoleMessages,
  blockTypeLabel,
  masterDataFieldMessages,
  mintCheckMessages,
  participantKindMessages,
  signerSignalExplanations,
  signerSignalMessages,
} from "@/pages/mint-checks/mint-checks-copy";
import { CheckLoading, CheckUnavailable, ParticipantMatchList, ReviewSignalLabel } from "@/pages/mint-checks/MintCheckParts";
import { formatDirectoryAddress } from "@/pages/mint-checks/mint-check-format";

const messages = defineMessages({
  refresh: {
    id: "quotes.signers.refresh",
    defaultMessage: "Refresh check",
    description: "Re-read the bill history and directory for the signer review",
  },
  title: {
    id: "quotes.signers.title",
    defaultMessage: "Signers on the bill",
    description: "Heading of the deterministic review of every signer along the quoted eBill",
  },
  intro: {
    id: "quotes.signers.intro",
    defaultMessage:
      "Every party along this bill, checked against what the eBill protocol records and this Mint’s own directory. Signals are reasons to look closer; they change nothing about the quote.",
    description: "What the signer review is and that it neither decides nor labels anyone",
  },
  signals: { id: "quotes.signers.signals", defaultMessage: "Review signals", description: "Heading of the signer signal summary" },
  noSignals: {
    id: "quotes.signers.noSignals",
    defaultMessage: "No review signals in the data checked.",
    description: "The signer review produced no signals; says nothing about data that could not be checked",
  },
  historyUnavailable: {
    id: "quotes.signers.historyUnavailable",
    defaultMessage:
      "The Mint could not serve this bill’s signed history. Only the bill’s party data was checked: signature checks are missing, not clear.",
    description: "Banner when the bill history was unavailable to the signer review",
  },
  applicant: { id: "quotes.signers.applicant", defaultMessage: "Applicant", description: "Badge on the bill holder who asked to mint" },
  anonymous: { id: "quotes.signers.anonymous", defaultMessage: "Anonymous", description: "A party without a named identity" },
  masterComplete: {
    id: "quotes.signers.masterComplete",
    defaultMessage: "Master data complete",
    description: "Name, postal address and email are present on the bill",
  },
  masterMissing: {
    id: "quotes.signers.masterMissing",
    defaultMessage: "Missing: {fields}",
    description: "Master data fields the bill does not carry for this party",
  },
  masterAnonymous: {
    id: "quotes.signers.masterAnonymous",
    defaultMessage: "No master data: anonymous party",
    description: "An anonymous party carries no name, address or email to check",
  },
  signatures: { id: "quotes.signers.signatures", defaultMessage: "Signatures", description: "Heading of a party's signed blocks" },
  noSignatures: {
    id: "quotes.signers.noSignatures",
    defaultMessage: "No signature by this party in the history checked.",
    description: "The party signed no block in the available bill history",
  },
  block: { id: "quotes.signers.block", defaultMessage: "Block {id}", description: "Bill history block number" },
  signedFrom: { id: "quotes.signers.signedFrom", defaultMessage: "Signed at: {address}", description: "Stated signing address of a block" },
  noSigningAddress: {
    id: "quotes.signers.noSigningAddress",
    defaultMessage: "No signing address stated",
    description: "The block carries no stated signing address",
  },
  signedFor: {
    id: "quotes.signers.signedFor",
    defaultMessage: "Signed by {person} for {company}",
    description: "A person signed this block on behalf of a company",
  },
  addressDiffers: {
    id: "quotes.signers.addressDiffers",
    defaultMessage: "Differs from the party’s address",
    description: "The stated signing address does not match the party's address on the bill",
  },
  duplicates: {
    id: "quotes.signers.duplicates",
    defaultMessage: "Possible duplicates in this Mint’s directory",
    description: "Heading of directory participants that look like this party",
  },
  blocks: { id: "quotes.signers.blocks", defaultMessage: "Blocks {ids}", description: "Bill history blocks a signal refers to" },
  recorded: {
    id: "quotes.signers.recorded",
    defaultMessage: "Recorded: {items}.",
    description: "What the eBill protocol records for each signature",
  },
  recordedNothing: {
    id: "quotes.signers.recordedNothing",
    defaultMessage: "Recorded: nothing checked — the signed history was not available.",
    description: "No signature data could be checked",
  },
  notRecorded: {
    id: "quotes.signers.notRecorded",
    defaultMessage: "Not recorded by the eBill protocol: {items}.",
    description: "Signature fingerprint data the protocol does not record and this check does not collect",
  },
  signing_time: { id: "quotes.signers.fp.signingTime", defaultMessage: "signing time", description: "Recorded signature data" },
  signing_address: {
    id: "quotes.signers.fp.signingAddress",
    defaultMessage: "stated signing address",
    description: "Recorded signature data",
  },
  signer_key: { id: "quotes.signers.fp.signerKey", defaultMessage: "signer key", description: "Recorded signature data" },
  company_signatory: {
    id: "quotes.signers.fp.companySignatory",
    defaultMessage: "company signatory",
    description: "Recorded signature data",
  },
  device: { id: "quotes.signers.fp.device", defaultMessage: "device", description: "Signature data the protocol does not record" },
  geolocation: {
    id: "quotes.signers.fp.geolocation",
    defaultMessage: "geolocation",
    description: "Signature data the protocol does not record",
  },
});

function shortRef(ref: string): string {
  return ref.length > 16 ? `${ref.slice(0, 12)}…` : ref;
}

function PartyCard({ party }: { party: BillSignerParty }) {
  const intl = useIntl();
  const name = party.name ?? intl.formatMessage(messages.anonymous);
  const list = (items: string[]) => intl.formatList(items, { type: "conjunction" });
  return (
    <li className="space-y-3 px-4 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="min-w-0 break-words text-sm font-medium">
          {name}
          {party.isApplicant && (
            <span className="ml-2 rounded-md border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-xs font-medium">
              {intl.formatMessage(messages.applicant)}
            </span>
          )}
        </p>
        <span className="text-xs text-muted-foreground">
          {[
            intl.formatMessage(participantKindMessages[party.kind]),
            ...party.roles.map((role) => intl.formatMessage(billRoleMessages[role])),
          ].join(" · ")}
        </span>
      </div>
      <p className={`text-xs ${party.masterData.status === "incomplete" ? "text-signal-alert" : "text-muted-foreground"}`}>
        {party.masterData.status === "complete"
          ? intl.formatMessage(messages.masterComplete)
          : party.masterData.status === "anonymous"
            ? intl.formatMessage(messages.masterAnonymous)
            : intl.formatMessage(messages.masterMissing, {
                fields: list(party.masterData.missing.map((field) => intl.formatMessage(masterDataFieldMessages[field]))),
              })}
      </p>
      {(party.postalAddress !== null || party.email !== null) && (
        <div className="space-y-0.5 text-xs text-muted-foreground">
          {party.postalAddress && <p className="break-words">{formatDirectoryAddress(party.postalAddress, intl.locale)}</p>}
          {party.email && <p className="break-all">{party.email}</p>}
        </div>
      )}
      <p className="break-all font-mono text-[11px] text-muted-foreground">{party.ref}</p>
      <div>
        <h5 className="text-xs font-medium">{intl.formatMessage(messages.signatures)}</h5>
        {party.signatures.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">{intl.formatMessage(messages.noSignatures)}</p>
        ) : (
          <ol className="mt-1 space-y-2">
            {party.signatures.map((signature) => {
              const type = blockTypeLabel(signature.blockType);
              return (
                <li key={signature.blockId} className="rounded-md bg-muted px-3 py-2 text-xs">
                  <p className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{type ? intl.formatMessage(type) : signature.blockType}</span>
                    <span className="text-muted-foreground">
                      {intl.formatMessage(messages.block, { id: signature.blockId })} ·{" "}
                      {intl.formatDate(signature.signedAt, { dateStyle: "medium", timeStyle: "medium" })}
                    </span>
                  </p>
                  {signature.signatory && signature.signatory.ref !== party.ref && (
                    <p className="mt-1">
                      {intl.formatMessage(messages.signedFor, {
                        person: signature.signatory.name ?? shortRef(signature.signatory.ref),
                        company: name,
                      })}
                    </p>
                  )}
                  <p className="mt-1 text-muted-foreground">
                    {signature.signingAddress
                      ? intl.formatMessage(messages.signedFrom, { address: formatDirectoryAddress(signature.signingAddress, intl.locale) })
                      : intl.formatMessage(messages.noSigningAddress)}
                    {signature.addressMatchesParty === false && (
                      <span className="ml-2 inline-flex items-center gap-1 text-signal-alert">
                        <CircleAlert className="size-3" aria-hidden="true" />
                        {intl.formatMessage(messages.addressDiffers)}
                      </span>
                    )}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      {party.directoryMatches.length > 0 && (
        <div className="space-y-2">
          <h5 className="flex flex-wrap items-center gap-2 text-xs font-medium">
            {intl.formatMessage(messages.duplicates)}
            <ReviewSignalLabel />
          </h5>
          <ParticipantMatchList matches={party.directoryMatches} />
        </div>
      )}
    </li>
  );
}

/** The signer review as recorded; presentational so it can be read without the Mint. */
export function BillSignerReviewView({ review }: { review: BillSignerReview }) {
  const intl = useIntl();
  const signalsId = useId();
  const names = new Map<string, string>();
  for (const party of review.parties) {
    names.set(party.ref, party.name ?? intl.formatMessage(messages.anonymous));
    for (const signature of party.signatures)
      if (signature.signatory?.name && !names.has(signature.signatory.ref)) names.set(signature.signatory.ref, signature.signatory.name);
  }
  // Directory matches are other identities, often under the same name: keep their key visible.
  for (const party of review.parties)
    for (const match of party.directoryMatches) if (!names.has(match.ref)) names.set(match.ref, `${match.name} · ${shortRef(match.ref)}`);
  const list = (items: string[]) => intl.formatList(items, { type: "conjunction" });
  return (
    <div className="space-y-5">
      {!review.historyAvailable && (
        <p role="status" className="flex items-start gap-2 rounded-lg border border-signal-alert/30 bg-signal-alert/5 p-3 text-sm">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-signal-alert" aria-hidden="true" />
          {intl.formatMessage(messages.historyUnavailable)}
        </p>
      )}
      {!review.directoryComplete && (
        <p role="status" className="flex items-start gap-2 rounded-lg border border-border bg-muted p-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          {intl.formatMessage(mintCheckMessages.directoryIncomplete)}
        </p>
      )}
      <section aria-labelledby={signalsId}>
        <h4 id={signalsId} className="text-sm font-medium">
          {intl.formatMessage(messages.signals)}
        </h4>
        {review.signals.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">{intl.formatMessage(messages.noSignals)}</p>
        ) : (
          <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
            {review.signals.map((signal, index) => (
              <li key={`${signal.kind}-${signal.parties.join(",")}-${index}`} className="space-y-1 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{intl.formatMessage(signerSignalMessages[signal.kind])}</p>
                  <ReviewSignalLabel />
                </div>
                <p className="text-sm text-muted-foreground">
                  {intl.formatMessage(signerSignalExplanations[signal.kind], { seconds: signal.seconds ?? 0 })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {list(signal.parties.map((ref) => names.get(ref) ?? shortRef(ref)))}
                  {signal.blockIds.length > 0 && <> · {intl.formatMessage(messages.blocks, { ids: signal.blockIds.join(", ") })}</>}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {review.parties.map((party) => (
          <PartyCard key={party.ref} party={party} />
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        {review.fingerprint.recorded.length > 0
          ? intl.formatMessage(messages.recorded, {
              items: list(review.fingerprint.recorded.map((item) => intl.formatMessage(messages[item]))),
            })
          : intl.formatMessage(messages.recordedNothing)}{" "}
        {intl.formatMessage(messages.notRecorded, {
          items: list(review.fingerprint.notRecorded.map((item) => intl.formatMessage(messages[item]))),
        })}
      </p>
    </div>
  );
}

export function BillSignerReviewPanel({ quoteId }: { quoteId: string }) {
  const intl = useIntl();
  const titleId = useId();
  const query = useBillSignerReview(quoteId);
  return (
    <section id="bill-signers" aria-labelledby={titleId} className="scroll-mt-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id={titleId} className="text-sm font-semibold">
            {intl.formatMessage(messages.title)}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{intl.formatMessage(messages.intro)}</p>
        </div>
        {query.data && (
          <Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => void query.refetch()}>
            {intl.formatMessage(messages.refresh)}
          </Button>
        )}
      </div>
      {query.error ? (
        <CheckUnavailable error={query.error} retrying={query.isFetching} onRetry={() => void query.refetch()} />
      ) : query.data ? (
        <BillSignerReviewView review={query.data} />
      ) : (
        <CheckLoading />
      )}
    </section>
  );
}
