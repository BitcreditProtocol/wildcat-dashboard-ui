import { publicDirectoryMessages } from "./public-directory-copy";
import type { ParticipantDirectoryResponse, PublicListing } from "@bitcredit/ai-credit-shared";
import { useIntl } from "react-intl";
import { RelayCoverageList } from "@/pages/credit/NetworkControlsPanels";

export function PublicListingDetails({ listing }: { listing: PublicListing }) {
  const intl = useIntl();
  return (
    <div className="space-y-1 break-words text-sm">
      <span className="inline-block rounded border px-1.5 text-xs">{intl.formatMessage(publicDirectoryMessages.public)}</span>
      <p className="font-medium">{listing.name}</p>
      <p className="break-all font-mono text-xs">{listing.subjectNodeId}</p>
      {listing.tradingNames.length > 0 && <p>{listing.tradingNames.join(" · ")}</p>}
      {listing.registration && (
        <p>
          {listing.registration.country} · {listing.registration.registry} · {listing.registration.number}
        </p>
      )}
      <p>{[listing.country, listing.region].filter(Boolean).join(" · ")}</p>
      {listing.description && <p>{listing.description}</p>}
      <p>{listing.products.map((product) => product.label).join(" · ")}</p>
      {listing.actingPersons.map((person, i) => (
        <p key={i}>
          {person.publicName} · {person.publicRole}
        </p>
      ))}
      {listing.businessContact && (
        <p>{[listing.businessContact.email, listing.businessContact.phone, listing.businessContact.website].filter(Boolean).join(" · ")}</p>
      )}
      <p className="break-all text-xs">{listing.contactRelays.join(" · ")}</p>
      <p className="text-xs">
        {intl.formatMessage(publicDirectoryMessages.validity, { time: new Date(listing.validUntil * 1000).toISOString() })}
      </p>
      <p className="text-xs text-muted-foreground">{intl.formatMessage(publicDirectoryMessages.signature)}</p>
    </div>
  );
}

export function PublicDirectoryResults({ directory }: { directory: ParticipantDirectoryResponse }) {
  const intl = useIntl();
  const m = publicDirectoryMessages;
  return (
    <section aria-label={intl.formatMessage(m.heading)} className="space-y-3">
      <h2 className="text-lg font-semibold">{intl.formatMessage(m.heading)}</h2>
      <p className="text-sm text-muted-foreground">{intl.formatMessage(m.scope)}</p>
      {directory.publicListings === undefined ? (
        <p className="text-sm">{intl.formatMessage(m.unavailable)}</p>
      ) : directory.publicListings.length === 0 ? (
        <p className="text-sm">{intl.formatMessage(m.noResults)}</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {directory.publicListings.map((entry) => (
            <li key={entry.eventId} className="space-y-2 rounded-md border p-3">
              <PublicListingDetails listing={entry.listing} />
              <p className="text-xs">{intl.formatMessage(m.score, { score: entry.score })}</p>
              <p className="break-all text-xs text-muted-foreground">
                {intl.formatMessage(m.event, {
                  author: entry.author,
                  event: entry.eventId,
                  time: new Date(entry.createdAt * 1000).toISOString(),
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DirectoryCoveragePanel({
  coverage,
  sync,
}: {
  coverage?: ParticipantDirectoryResponse["publicCoverage"];
  sync?: ParticipantDirectoryResponse["publicSync"];
}) {
  const intl = useIntl();
  const m = publicDirectoryMessages;
  const time = (value: number | null) => (value === null ? intl.formatMessage(m.never) : new Date(value * 1000).toISOString());
  return (
    <div className="space-y-2">
      <p className="text-sm">{intl.formatMessage(m.networkUnknown)}</p>
      {coverage ? (
        <>
          <RelayCoverageList coverage={coverage.relays.map((relay) => relay.coverage)} />
          <ul className="break-all text-xs">
            {coverage.relays.map((relay) => (
              <li key={relay.relay}>
                {intl.formatMessage(m.lastSync, { relay: relay.relay, time: time(relay.lastSuccessfulSync), cursor: relay.cursor })}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm">{intl.formatMessage(m.noCoverage)}</p>
      )}
      {sync ? (
        <>
          <p className="text-xs">
            {intl.formatMessage(m.sync, {
              time: time(sync.snapshotAt),
              seconds: sync.backfillWindowSeconds,
              skipped: time(sync.skippedBefore),
            })}
          </p>
          <ul className="break-all text-xs">
            {sync.windows.map((window, i) => (
              <li key={i}>
                {intl.formatMessage(m.window, {
                  relay: window.relay,
                  since: time(window.since),
                  until: time(window.until),
                  status: window.error ?? intl.formatMessage(window.capped ? m.capped : m.bounded),
                })}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm">{intl.formatMessage(m.noSync)}</p>
      )}
    </div>
  );
}

export function FederationStatusPanel({ directory }: { directory: ParticipantDirectoryResponse }) {
  const intl = useIntl();
  const m = publicDirectoryMessages;
  return (
    <section aria-label={intl.formatMessage(m.health)} className="space-y-3 rounded-md border p-4">
      <h2 className="text-lg font-semibold">{intl.formatMessage(m.health)}</h2>
      <p className="text-sm text-signal-alert">{intl.formatMessage(m.gap)}</p>
      <DirectoryCoveragePanel coverage={directory.publicCoverage} sync={directory.publicSync} />
    </section>
  );
}
