import type { FraudControls, RelayCoverage } from "@bitcredit/ai-credit-shared";
import { Button } from "@bitcredit/ui-library";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import type { DecisionCase } from "./decision-types";
import { fraudReasonMessages } from "./fraud-controls-copy";
import { networkMessages as m } from "./network-controls-copy";
import { retryOperatorVerificationSources, type OperatorCapability } from "./record-operator-decision";

export function RelayCoverageList({ coverage }: { coverage: readonly RelayCoverage[] }) {
  const intl = useIntl();
  if (coverage.length === 0) return <p className="text-xs text-signal-alert">{intl.formatMessage(m.coverageMissing)}</p>;
  return (
    <ul className="space-y-1 break-all text-xs text-muted-foreground">
      {coverage.map((relay) => (
        <li key={relay.relay}>
          {intl.formatMessage(m.relay, {
            relay: relay.relay,
            reachable: intl.formatMessage(relay.reachable ? m.reachable : m.unreachable),
            complete: intl.formatMessage(relay.eose ? m.eose : m.noEose),
            cap: intl.formatMessage(relay.capped ? m.capped : m.uncapped),
          })}
          {relay.error && <span> · {relay.error}</span>}
        </li>
      ))}
    </ul>
  );
}

export function FinanceLocksPanel({ decisionCase, capability }: { decisionCase: DecisionCase; capability?: OperatorCapability }) {
  const intl = useIntl();
  const client = useQueryClient();
  const locks = decisionCase.snapshot.fraudControls?.financeLocks;
  const retry = useMutation({
    mutationFn: async () => {
      const result = await retryOperatorVerificationSources(
        {
          billId: decisionCase.snapshot.bill?.billId ?? "",
          caseId: decisionCase.snapshot.caseId,
          decisionResultDigest: decisionCase.resultDigest,
        },
        capability
      );
      if (!result.ok) throw new Error("Lock source retry failed");
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["ai-credit", "decisions"] });
    },
  });
  const summary = !locks
    ? m.missing
    : locks.status === "held-elsewhere"
      ? fraudReasonMessages.finance_lock_held_elsewhere
      : locks.status === "incomplete"
        ? fraudReasonMessages.finance_lock_check_incomplete
        : m.clear;
  return (
    <section aria-label={intl.formatMessage(m.locks)} className="space-y-3">
      <h3 className="font-semibold">{intl.formatMessage(m.locks)}</h3>
      <p className={locks?.status === "clear" ? "text-sm" : "text-sm text-signal-alert"}>{intl.formatMessage(summary)}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["bill", "invoice"] as const).map((scope) => {
          const lock = locks?.instruments.find((item) => item.scope === scope);
          return (
            <section key={scope} aria-label={intl.formatMessage(m[scope])} className="space-y-2 rounded-md border p-3">
              <h4 className="text-sm font-semibold">{intl.formatMessage(m[scope])}</h4>
              {lock ? (
                <>
                  <p className="text-sm">
                    {intl.formatMessage(m[lock.state])} · {intl.formatMessage(m[lock.holder])}
                  </p>
                  {lock.holder === "other_mint" && (
                    <p className="text-sm text-signal-alert">{intl.formatMessage(fraudReasonMessages.finance_lock_held_elsewhere)}</p>
                  )}
                  <p className="break-all font-mono text-xs">{lock.lockKey}</p>
                  <RelayCoverageList coverage={lock.coverage} />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{intl.formatMessage(m.missing)}</p>
              )}
            </section>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{intl.formatMessage(m.lockScope)}</p>
      {locks && locks.status !== "clear" && (
        <Button
          size="sm"
          variant="outline"
          disabled={!capability || !decisionCase.snapshot.bill || decisionCase.assessmentCurrency !== "current" || retry.isPending}
          onClick={() => retry.mutate()}
        >
          {intl.formatMessage(m.retry)}
        </Button>
      )}
      {retry.isError && (
        <p role="alert" className="text-sm text-destructive">
          {intl.formatMessage(m.retryFailed)}
        </p>
      )}
      {retry.isSuccess && (
        <p role="status" className="text-sm">
          {intl.formatMessage(m.retryDone)}
        </p>
      )}
    </section>
  );
}

export function BuyerRegistrationPanel({ decisionCase }: { decisionCase: DecisionCase }) {
  const intl = useIntl();
  const comparison = decisionCase.snapshot.fraudControls?.buyerRegistration;
  return (
    <section aria-label={intl.formatMessage(m.registration)} className="space-y-2 rounded-md border p-3">
      <h3 className="font-semibold">{intl.formatMessage(m.registration)}</h3>
      <p className="text-sm">{intl.formatMessage(comparison ? m[comparison] : m.missing)}</p>
      <p className="break-words text-xs text-muted-foreground">
        {intl.formatMessage(m.registrationScope, { node: decisionCase.snapshot.bill?.acceptorRef ?? intl.formatMessage(m.unspecified) })}
      </p>
    </section>
  );
}

function AttestationCard({ evidence }: { evidence: NonNullable<FraudControls["crossMint"]>[number] }) {
  const intl = useIntl();
  const a = evidence.attestation;
  // Expiry must become visible even while the operator leaves an immutable snapshot open.
  const [expired, setExpired] = useState(() => a.validUntil * 1000 <= Date.now());
  useEffect(() => {
    const delay = a.validUntil * 1000 - Date.now();
    if (delay <= 0) {
      setExpired(true);
      return;
    }
    const timer = window.setTimeout(() => setExpired(true), Math.min(delay, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [a.validUntil]);
  const revoked =
    evidence.validity === "revoked" ||
    (evidence.revocation !== undefined && evidence.revocation.state !== "none") ||
    (evidence.revocation?.receipts.length ?? 0) > 0;
  const validity = revoked
    ? m.validityRevoked
    : expired || evidence.validity === "expired"
      ? m.validityExpired
      : evidence.validity === "active"
        ? m.validityActive
        : m.validityUnknown;
  const usability =
    revoked || expired || evidence.validity === "expired" || evidence.usableForDecisions === false
      ? m.notUsable
      : evidence.usableForDecisions === true && evidence.validity === "active" && evidence.revocation?.state === "none"
        ? m.usable
        : m.usabilityUnknown;
  const time = (value: number | null) => (value === null ? intl.formatMessage(m.unspecified) : new Date(value * 1000).toISOString());
  return (
    <article className="space-y-2 rounded-md border p-3">
      <h4 className="break-all text-sm font-semibold">
        {intl.formatMessage(m.assertion, { mint: evidence.source.mintPubkey, observation: intl.formatMessage(m[a.observations.seen]) })}
      </h4>
      <p className="break-all text-xs">
        {intl.formatMessage(m.attestationScope, {
          bill: a.scope.billId,
          state: a.scope.billStateHash,
          count: a.scope.recordCount,
          start: time(a.scope.windowStart),
          end: time(a.scope.windowEnd),
        })}
      </p>
      <p className="text-sm">{intl.formatMessage(m[a.coverage])}</p>
      <p className="text-xs">{intl.formatMessage(m.freshness, { asOf: time(a.asOf), until: time(a.validUntil) })}</p>
      <p className={expired ? "text-sm text-signal-alert" : "text-xs"}>{intl.formatMessage(expired ? m.expired : m.current)}</p>
      <p className="text-xs">{intl.formatMessage(m.signature)}</p>
      <p className="text-xs">{intl.formatMessage(validity)}</p>
      <p className="text-sm font-medium">{intl.formatMessage(usability)}</p>
      <p className="text-xs">
        {intl.formatMessage(
          !evidence.revocation
            ? m.revocation
            : evidence.revocation.state === "none"
              ? m.revocationNone
              : evidence.revocation.state === "pending"
                ? m.revocationPending
                : m.revocationAcknowledged
        )}
      </p>
      <div className="space-y-1 text-xs">
        <h5 className="font-medium">{intl.formatMessage(m.receipts)}</h5>
        {evidence.revocation?.receipts.length ? (
          <ul className="space-y-1 break-all">
            {evidence.revocation.receipts.map((receipt, i) => (
              <li key={`${receipt.grantId}:${receipt.revokeDigest}:${i}`}>
                {intl.formatMessage(m.receipt, {
                  grant: receipt.grantId,
                  digest: receipt.revokeDigest,
                  status: intl.formatMessage(receipt.status === "revoked" ? m.receiptRevoked : m.receiptReleased),
                })}
              </li>
            ))}
          </ul>
        ) : (
          <p>{intl.formatMessage(m.noReceipts)}</p>
        )}
      </div>
      <p className="text-xs">
        {intl.formatMessage(m.observations, {
          acquired: intl.formatMessage(
            a.observations.acquiredRecorded === "unknown" ? m.unknown : a.observations.acquiredRecorded ? m.yes : m.no
          ),
        })}
      </p>
      <ul className="text-xs">
        {a.observations.quoted.map((quote, i) => (
          <li key={i}>{intl.formatMessage(m.quoted, { state: quote.state, expiry: time(quote.expiresAt) })}</li>
        ))}
      </ul>
    </article>
  );
}

export function CrossMintEvidencePanel({ decisionCase }: { decisionCase: DecisionCase }) {
  const intl = useIntl();
  const evidence = decisionCase.snapshot.fraudControls?.crossMint;
  return (
    <section aria-label={intl.formatMessage(m.crossMint)} className="space-y-3">
      <h3 className="font-semibold">{intl.formatMessage(m.crossMint)}</h3>
      <p className="text-xs text-muted-foreground">{intl.formatMessage(m.evidenceScope)}</p>
      {evidence?.length ? (
        evidence.map((entry) => <AttestationCard key={`${entry.source.messageId}:${entry.attestation.validUntil}`} evidence={entry} />)
      ) : (
        <p className="text-sm">{intl.formatMessage(m.noEvidence)}</p>
      )}
    </section>
  );
}
