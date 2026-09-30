import type { FacilityBinding, FacilityCoverage } from "@bitcredit/ai-credit-shared";
import { Link } from "react-router";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";
import { allowanceBreakdown } from "./facility-allowance";

const reasons = defineMessages({
  agreement_changed: {
    id: "facilities.coverage.changed",
    defaultMessage: "Agreement changed. Operator: reassess this case against the accepted version.",
  },
  agreement_inactive: {
    id: "facilities.coverage.inactive",
    defaultMessage: "Agreement expired or an update is in progress. Applicant: complete the update and acceptance.",
  },
  rules_missing: {
    id: "facilities.coverage.rules",
    defaultMessage:
      "This older agreement has no bill eligibility rules. Operator: prepare an updated agreement; the applicant must accept it.",
  },
  payer_outside_scope: {
    id: "facilities.coverage.payer",
    defaultMessage: "This payer is not included. Operator: review a change to the agreement before offering.",
  },
  bill_too_large: {
    id: "facilities.coverage.size",
    defaultMessage: "The bill exceeds the agreed per-bill maximum. Operator: review a limit change before offering.",
  },
  tenor_outside_scope: {
    id: "facilities.coverage.tenor",
    defaultMessage: "The bill's maturity is outside the agreed term. Operator: review eligibility before offering.",
  },
  allowance_exceeded: {
    id: "facilities.coverage.capacity",
    defaultMessage: "There is not enough remaining allowance for this whole bill. Operator: review outstanding offers or a limit change.",
  },
  binding_mismatch: {
    id: "facilities.coverage.binding",
    defaultMessage: "Applicant or Mint does not match. Operator: stop and check the case binding.",
  },
  reservation_conflict: {
    id: "facilities.coverage.conflict",
    defaultMessage: "An earlier reservation conflicts with this case. Operator: reconcile the existing quote before another offer.",
  },
});

export function FacilityCoveragePanel({ coverage, quoteId }: { coverage: FacilityCoverage; quoteId?: string }) {
  const intl = useIntl();
  const totals = allowanceBreakdown(coverage.allowance);
  const accepted = coverage.allowance.entries.some((entry) => entry.quoteId === quoteId && entry.state === "committed");
  const amount = (value: string) => `${new Intl.NumberFormat(intl.locale).format(BigInt(value))} sat`;
  return (
    <section
      id="facility-coverage"
      className="rounded-lg border border-border p-5 md:p-6"
      aria-label={intl.formatMessage({ id: "facilities.coverage.title", defaultMessage: "Facility coverage" })}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-medium">
          <FormattedMessage id="facilities.coverage.title" defaultMessage="Facility coverage" />
        </h3>
        <Link className="text-sm underline underline-offset-4" to={`/facilities?application=${coverage.binding.facilityId}`}>
          <FormattedMessage
            id="facilities.coverage.agreement"
            defaultMessage="Agreement · version {version}"
            values={{ version: coverage.binding.agreementVersion }}
          />
        </Link>
      </div>
      <p className="mt-2 text-sm">
        {coverage.status === "blocked" ? (
          <FormattedMessage id="facilities.coverage.blocked" defaultMessage="Agreement does not currently cover an offer for this bill." />
        ) : coverage.status === "reserved" ? (
          accepted ? (
            <FormattedMessage
              id="facilities.coverage.accepted"
              defaultMessage="This quote was accepted. Its whole eBill amount is included in the allowance used below. Acceptance is not proof of minting or payment."
              description="Confirmed accepted quote exposure, distinct from value issuance"
            />
          ) : (
            <FormattedMessage
              id="facilities.coverage.reserved"
              defaultMessage="Allowance held for this quote. This is not proof of minting or payment."
            />
          )
        ) : (
          <FormattedMessage
            id="facilities.coverage.eligible"
            defaultMessage="Within the configured agreement limits. Bill checks and operator approval are still required."
          />
        )}
      </p>
      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">
            <FormattedMessage
              id="facilities.coverage.limit"
              defaultMessage="Agreement limit"
              description="Total outstanding whole-bill limit"
            />
          </dt>
          <dd className="mt-1 font-medium">{amount(coverage.allowance.limitSat)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            <FormattedMessage id="facilities.coverage.held" defaultMessage="Already held" />
          </dt>
          <dd className="mt-1 font-medium">{amount(coverage.allowance.reservedSat)}</dd>
          <p className="mt-1 text-xs text-muted-foreground">
            <FormattedMessage
              id="facilities.coverage.heldBreakdown"
              defaultMessage="{accepted} in accepted quotes · {offers} reserved for offers"
              values={{ accepted: amount(totals.acceptedSat.toString()), offers: amount(totals.offerSat.toString()) }}
              description="Breakdown of facility capacity currently held"
            />
          </p>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            {coverage.status === "reserved" ? (
              <FormattedMessage
                id="facilities.coverage.remainingNow"
                defaultMessage="Remaining allowance"
                description="Capacity left with this quote already counted"
              />
            ) : (
              <FormattedMessage
                id="facilities.coverage.after"
                defaultMessage="Remaining if offered"
                description="Hypothetical remaining capacity, not approval"
              />
            )}
          </dt>
          <dd className="mt-1 font-medium">{coverage.status === "blocked" ? "—" : amount(coverage.remainingAfterOfferSat)}</dd>
        </div>
      </dl>
      {!!coverage.blockers.length && (
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm">
          {coverage.blockers.map((reason) => (
            <li key={reason}>{intl.formatMessage(reasons[reason])}</li>
          ))}
        </ul>
      )}
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-muted-foreground">
          <FormattedMessage id="facilities.coverage.conditions" defaultMessage="Scope and accounting basis" />
        </summary>
        <p className="mt-2 whitespace-pre-wrap">{coverage.eligibleScope}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          <FormattedMessage
            id="facilities.coverage.basis"
            defaultMessage="Synthetic, non-binding allowance. Each authorized offer holds the whole bill amount, not the net payout. Accepted exposure stays held until settlement is independently reconciled. No automatic approval."
          />
        </p>
      </details>
    </section>
  );
}

/** The same anchor for a bound bill without a coverage result: nothing is estimated and nothing is approvable. */
export function FacilityCoverageUnavailable({ binding }: { binding: FacilityBinding }) {
  const intl = useIntl();
  return (
    <section
      id="facility-coverage"
      className="rounded-lg border border-border p-5 md:p-6"
      aria-label={intl.formatMessage({ id: "facilities.coverage.title", defaultMessage: "Facility coverage" })}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-medium">
          <FormattedMessage id="facilities.coverage.title" defaultMessage="Facility coverage" />
        </h3>
        <Link className="text-sm underline underline-offset-4" to={`/facilities?application=${binding.facilityId}`}>
          <FormattedMessage
            id="facilities.coverage.agreement"
            defaultMessage="Agreement · version {version}"
            values={{ version: binding.agreementVersion }}
          />
        </Link>
      </div>
      <p className="mt-2 text-sm">
        <FormattedMessage
          id="facilities.coverage.unavailable"
          defaultMessage="Coverage for this bill is unavailable, so no offer can be approved. No coverage is estimated here."
          description="A Facility Agreement-bound bill has no current coverage result"
        />
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        <FormattedMessage
          id="facilities.coverage.unavailableNext"
          defaultMessage="Next step · You: open the bound agreement and check its current status."
          description="Operator-owned next step while the bound agreement's coverage for this bill is unavailable"
        />
      </p>
    </section>
  );
}
