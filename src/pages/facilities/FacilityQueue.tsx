import type { FacilityApplication } from "@bitcredit/ai-credit-shared";
import { Button, Search, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, cn } from "@bitcredit/ui-library";
import { FormattedDate, FormattedMessage, useIntl } from "react-intl";
import { Link } from "react-router";
import { facilityActorMessages, facilityDisplayStatus, facilityStatusKey, facilityStatusMessages } from "./facility-copy";
import { facilityQueueLocation, selectFacilityQueue } from "./facility-queue";

interface FacilityQueueProps {
  applications: readonly FacilityApplication[];
  params: URLSearchParams;
  onParamsChange: (next: URLSearchParams, replace?: boolean) => void;
}

export function FacilityQueue({ applications, params, onParamsChange }: FacilityQueueProps) {
  const intl = useIntl();
  const queue = selectFacilityQueue(applications, params, intl.locale);
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.delete("application");
    next.delete("page");
    if (value) next.set(key, value);
    else next.delete(key);
    onParamsChange(next, key === "q");
  };
  const setPage = (page: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(page));
    onParamsChange(next);
  };
  const reset = () => {
    const next = new URLSearchParams(params);
    for (const key of ["q", "status", "page"]) next.delete(key);
    onParamsChange(next);
  };
  return (
    <section
      className="space-y-4"
      aria-label={intl.formatMessage({
        id: "facilities.queueLabel",
        defaultMessage: "Facility applications",
        description: "Application selection navigation",
      })}
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px_200px]">
        <Search
          value={queue.search}
          size="sm"
          enableDebounce={false}
          placeholder={intl.formatMessage({
            id: "facilities.search",
            defaultMessage: "Search applications…",
            description: "Search all facility applications before paging",
          })}
          onChange={(value) => update("q", value)}
          onSearch={(value) => update("q", value)}
        />
        <Select value={queue.status} onValueChange={(value) => update("status", value)}>
          <SelectTrigger
            label={intl.formatMessage({
              id: "facilities.filterStatus",
              defaultMessage: "Status",
              description: "Facility queue status filter",
            })}
            aria-label={intl.formatMessage({
              id: "facilities.filterStatus",
              defaultMessage: "Status",
              description: "Facility queue status filter",
            })}
            hasValue
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <FormattedMessage id="facilities.allStatuses" defaultMessage="All statuses" description="No facility status filter" />
            </SelectItem>
            {Object.entries(facilityStatusMessages).map(([key, message]) => (
              <SelectItem key={key} value={key}>
                {intl.formatMessage(message)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={queue.sort} onValueChange={(value) => update("sort", value)}>
          <SelectTrigger
            label={intl.formatMessage({ id: "facilities.sort", defaultMessage: "Sort", description: "Facility queue order" })}
            aria-label={intl.formatMessage({ id: "facilities.sort", defaultMessage: "Sort", description: "Facility queue order" })}
            hasValue
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="attention">
              <FormattedMessage
                id="facilities.sortAttention"
                defaultMessage="Review first"
                description="Prioritize facilities awaiting operator review"
              />
            </SelectItem>
            <SelectItem value="recent">
              <FormattedMessage id="facilities.sortRecent" defaultMessage="Recently updated" description="Latest facility activity first" />
            </SelectItem>
            <SelectItem value="oldest">
              <FormattedMessage
                id="facilities.sortOldest"
                defaultMessage="Oldest update first"
                description="Longest unchanged facilities first"
              />
            </SelectItem>
            <SelectItem value="name">
              <FormattedMessage id="facilities.sortName" defaultMessage="Applicant name" description="Sort facilities by applicant name" />
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <p role="status">
          <FormattedMessage
            id="facilities.queueCount"
            defaultMessage="{first}–{last} of {count} {count, plural, one {application} other {applications}}"
            description="Current page range among filtered applications"
            values={{ first: queue.first, last: queue.last, count: queue.filteredTotal }}
          />
          {queue.filteredTotal !== queue.total && (
            <>
              {" "}
              ·{" "}
              <FormattedMessage
                id="facilities.totalCount"
                defaultMessage="{total} total"
                description="All applications including filtered-out cases"
                values={{ total: queue.total }}
              />
            </>
          )}
        </p>
        {(queue.search || queue.status !== "all") && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <FormattedMessage id="facilities.clearFilters" defaultMessage="Clear filters" description="Reset queue search and status" />
          </Button>
        )}
      </div>
      {queue.items.length === 0 ? (
        <div className="rounded-lg border border-border p-8 text-center">
          <p>
            <FormattedMessage
              id="facilities.noMatches"
              defaultMessage="No applications match these filters."
              description="Filtered queue is empty, not the underlying inbox"
            />
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              <FormattedMessage
                id="facilities.queueCaption"
                defaultMessage="Facility application queue. Open an applicant to review their case."
                description="Accessible queue table description"
              />
            </caption>
            <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  <FormattedMessage id="facilities.columnApplicant" defaultMessage="Applicant" description="Applicant and purpose column" />
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  <FormattedMessage id="facilities.columnStatus" defaultMessage="Status" description="Facility lifecycle status column" />
                </th>
                <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">
                  <FormattedMessage
                    id="facilities.columnNext"
                    defaultMessage="Next action by"
                    description="Owner of the next facility step"
                  />
                </th>
                <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">
                  <FormattedMessage
                    id="facilities.columnUpdated"
                    defaultMessage="Updated"
                    description="Last application activity, not original submission date"
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {queue.items.map((app) => (
                <tr key={app.id} className="align-top hover:bg-muted/30">
                  <th scope="row" className="max-w-sm px-4 py-4 font-normal">
                    <Link
                      className="font-medium underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2"
                      to={facilityQueueLocation(params, app.id)}
                    >
                      {app.applicantName}
                    </Link>
                    <p className="mt-1 line-clamp-2 break-words text-xs text-muted-foreground">
                      {app.summary?.purpose.trim()
                        ? app.summary.purpose
                        : intl.formatMessage({
                            id: "facilities.purposePending",
                            defaultMessage: "Purpose not submitted yet",
                            description: "Facility draft has no confirmed summary",
                          })}
                    </p>
                  </th>
                  <td className="max-w-[240px] px-4 py-4">
                    <span
                      className={cn(
                        "inline-flex rounded-md border border-border px-2 py-1 text-xs",
                        facilityStatusKey(app) === "operator_review" && "border-primary/40 bg-primary/10"
                      )}
                    >
                      {intl.formatMessage(facilityDisplayStatus(app))}
                    </span>
                  </td>
                  <td className="hidden px-4 py-4 text-xs text-muted-foreground md:table-cell">
                    {intl.formatMessage(facilityActorMessages[app.progress.nextActor])}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-4 text-xs text-muted-foreground sm:table-cell">
                    <FormattedDate value={app.updatedAt} year="numeric" month="short" day="numeric" />
                    <br />
                    <FormattedDate value={app.updatedAt} hour="2-digit" minute="2-digit" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {queue.pageCount > 1 && (
        <nav
          className="flex items-center justify-between gap-3"
          aria-label={intl.formatMessage({
            id: "facilities.pagination",
            defaultMessage: "Application pages",
            description: "Facility queue pagination",
          })}
        >
          <Button variant="outline" size="sm" disabled={queue.page === 1} onClick={() => setPage(queue.page - 1)}>
            <FormattedMessage id="facilities.previousPage" defaultMessage="Previous" description="Previous page of facilities" />
          </Button>
          <p className="text-sm text-muted-foreground">
            <FormattedMessage
              id="facilities.pageCount"
              defaultMessage="Page {page} of {pages}"
              description="Facility queue current page"
              values={{ page: queue.page, pages: queue.pageCount }}
            />
          </p>
          <Button variant="outline" size="sm" disabled={queue.page === queue.pageCount} onClick={() => setPage(queue.page + 1)}>
            <FormattedMessage id="facilities.nextPage" defaultMessage="Next" description="Next page of facilities" />
          </Button>
        </nav>
      )}
    </section>
  );
}
