import type { FacilityCoverage } from "@bitcredit/ai-credit-shared";
import { FormattedMessage, useIntl } from "react-intl";
import { Link } from "react-router";
import { allowanceBreakdown } from "./facility-allowance";

export function FacilityAllowance({ allowance }: { allowance: FacilityCoverage["allowance"] }) {
  const intl = useIntl();
  const totals = allowanceBreakdown(allowance);
  const amount = (value: string | bigint) => `${BigInt(value).toLocaleString(intl.locale)} sat`;
  return (
    <div>
      <dl className="mt-4 grid grid-cols-2 gap-5 lg:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">
            <FormattedMessage
              id="facilities.coverage.limit"
              defaultMessage="Agreement limit"
              description="Total outstanding whole-bill limit"
            />
          </dt>
          <dd className="mt-1 font-medium tabular-nums">{amount(allowance.limitSat)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            <FormattedMessage
              id="facilities.allowance.acceptedTotal"
              defaultMessage="Accepted quotes ({count})"
              values={{ count: totals.acceptedCount }}
              description="Accepted quote exposure still using the agreement limit"
            />
          </dt>
          <dd className="mt-1 font-medium tabular-nums">{amount(totals.acceptedSat)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            <FormattedMessage
              id="facilities.allowance.offerTotal"
              defaultMessage="Reserved for offers ({count})"
              values={{ count: totals.offerCount }}
              description="Outstanding offers reserving whole bill amounts"
            />
          </dt>
          <dd className="mt-1 font-medium tabular-nums">{amount(totals.offerSat)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            <FormattedMessage
              id="facilities.allowance.remaining"
              defaultMessage="Remaining allowance"
              description="Capacity not held by accepted quotes or offers, not money"
            />
          </dt>
          <dd className="mt-1 font-semibold tabular-nums">{amount(allowance.availableSat)}</dd>
        </div>
      </dl>
      <p className="mt-4 text-xs text-muted-foreground">
        <FormattedMessage
          id="facilities.allowance.explanation"
          defaultMessage="Accepted quotes and outstanding offers both use the whole eBill amount. Applications in review use no allowance. This is not a wallet balance or proof that money was minted; accepted exposure stays held until settlement is reconciled."
          description="Distinguish capacity, approval, minting and settlement"
        />
      </p>
      {!allowance.entries.length ? (
        <p className="mt-4 text-sm text-muted-foreground">
          <FormattedMessage
            id="facilities.allowance.empty"
            defaultMessage="No linked eBills yet. An accepted eBill is linked when its case is assessed for this Mint."
            description="No bill cases linked to the facility"
          />
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {allowance.entries.map((entry) => (
            <li key={entry.quoteId} className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 py-3 text-sm">
              <Link className="font-medium tabular-nums underline underline-offset-4" to={`/quotes/${entry.quoteId}`}>
                <FormattedMessage
                  id="facilities.allowance.billAmount"
                  defaultMessage="{amount} eBill"
                  values={{ amount: amount(entry.faceValueSat) }}
                  description="Open the quote for this identifiable eBill amount"
                />
              </Link>
              <span className="text-muted-foreground">
                {entry.state === "assessed" ? (
                  BigInt(entry.faceValueSat) > BigInt(allowance.availableSat) ? (
                    <FormattedMessage
                      id="facilities.allowance.capacityBlocked"
                      defaultMessage="Exceeds remaining allowance · no allowance used"
                      description="Display-only capacity warning for a linked unreserved case, not a full eligibility decision"
                    />
                  ) : (
                    <FormattedMessage
                      id="facilities.allowance.assessed"
                      defaultMessage="In review · no allowance used"
                      description="Assessment alone does not reserve capacity"
                    />
                  )
                ) : entry.state === "released" ? (
                  <FormattedMessage
                    id="facilities.allowance.released"
                    defaultMessage="Reservation released"
                    description="Terminal unaccepted quote no longer uses capacity"
                  />
                ) : entry.state === "committed" ? (
                  <FormattedMessage
                    id="facilities.allowance.committed"
                    defaultMessage="Quote accepted · allowance used"
                    description="Accepted quote does not establish minting or payment"
                  />
                ) : (
                  <FormattedMessage
                    id="facilities.allowance.reserved"
                    defaultMessage="Offer pending · allowance reserved"
                    description="Offer not yet accepted still holds allowance"
                  />
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
