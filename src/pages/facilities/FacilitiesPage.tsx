import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FacilityApplication, FacilityOperatorCommand } from "@bitcredit/ai-credit-shared";
import { Button } from "@bitcredit/ui-library";
import { FormattedMessage } from "react-intl";
import { Link, useSearchParams } from "react-router";
import {
  facilityQueryKey,
  facilityRefetchInterval,
  FacilityRequestError,
  readFacilityApplications,
  sendFacilityCommand,
} from "./facility-api";
import { FacilityCase } from "./FacilityCase";
import { FacilityQueue } from "./FacilityQueue";
import { facilityQueueLocation } from "./facility-queue";
import {
  facilityOperatorScope,
  FacilityRecoveryError,
  finishReassessment,
  pendingReassessment,
  saveReassessment,
} from "./facility-recovery";

export default function FacilitiesPage() {
  const client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("application");
  const operatorScope = facilityOperatorScope();
  const query = useQuery({
    queryKey: facilityQueryKey,
    queryFn: readFacilityApplications,
    refetchInterval: (state) => facilityRefetchInterval(state.state.data),
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: async (command: FacilityOperatorCommand) => {
      if (command.action === "reassess") {
        if (operatorScope !== facilityOperatorScope()) throw new FacilityRecoveryError();
        saveReassessment(operatorScope, command);
      }
      return sendFacilityCommand(command);
    },
    onSuccess: (application, command) => {
      if (command.action === "reassess") finishReassessment(operatorScope, command);
      client.setQueryData<FacilityApplication[]>(facilityQueryKey, (items) =>
        items?.map((item) => (item.id === application.id ? application : item))
      );
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: facilityQueryKey });
    },
  });
  const applications = query.data ?? [];
  // An unknown/stale deep link must never silently select a different applicant.
  const app = selectedId ? applications.find((item) => item.id === selectedId) : undefined;
  const live = query.isFetchedAfterMount && !query.isError && !query.isFetching;
  const recovery = pendingReassessment(operatorScope, app);
  const handleCommand = async (command: FacilityOperatorCommand) => {
    await mutation.mutateAsync(command);
  };
  return (
    <div className="space-y-6 p-4 md:p-6">
      {selectedId && (
        <Link
          className="inline-flex text-sm text-muted-foreground underline-offset-4 hover:underline"
          to={facilityQueueLocation(params)}
          onClick={() => mutation.reset()}
        >
          <FormattedMessage
            id="facilities.backToQueue"
            defaultMessage="Back to applications"
            description="Return to the facility queue with its filters and page preserved"
          />
        </Link>
      )}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            <FormattedMessage
              id="facilities.title"
              defaultMessage="Facility applications"
              description="Pre-bill queue, separate from quotes"
            />
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            <FormattedMessage
              id="facilities.description"
              defaultMessage="Meet applicants before their first eBill. No minting takes place here."
              description="Facility preparation boundary"
            />
          </p>
        </div>
        <Button
          variant="outline"
          disabled={query.isFetching || mutation.isPending}
          onClick={() => {
            void query.refetch();
          }}
        >
          <FormattedMessage
            id="facilities.refresh"
            defaultMessage="Refresh"
            description="Refresh facility queue and discover new applications"
          />
        </Button>
      </header>
      {query.isError && (
        <p role="alert" className="rounded-lg border border-border p-4 text-sm">
          <FormattedMessage
            id="facilities.error"
            defaultMessage="Could not load current applications. Any displayed information is read-only until you refresh successfully."
            description="Facility queue cannot authorize actions from stale data"
          />
        </p>
      )}
      {query.isPending ? (
        <p role="status">
          <FormattedMessage id="facilities.loading" defaultMessage="Loading applications…" description="Queue loading state" />
        </p>
      ) : query.isError && query.data === undefined ? null : !selectedId && !applications.length ? (
        <div className="rounded-xl border border-border p-8 text-center">
          <h2 className="font-medium">
            <FormattedMessage id="facilities.empty" defaultMessage="No facility applications yet" description="Empty preparation queue" />
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            <FormattedMessage
              id="facilities.emptyHint"
              defaultMessage="Applicants can start from Settings → Mints in eBill, without an eBill."
              description="Applicant facility entry instructions"
            />
          </p>
        </div>
      ) : !selectedId ? (
        <FacilityQueue applications={applications} params={params} onParamsChange={(next, replace) => setParams(next, { replace })} />
      ) : (
        <div>
          {app ? (
            <div className="min-w-0 space-y-4">
              {mutation.isError && mutation.variables?.id === app.id && (
                <p role="alert" className="rounded-lg border border-border p-4 text-sm">
                  {mutation.error instanceof FacilityRecoveryError ? (
                    <FormattedMessage
                      id="facilities.recoveryStorageError"
                      defaultMessage="The assessment request was not sent because its retry record could not be saved. Sign in and allow session storage before retrying."
                      description="Fail closed before a model request when exact recovery cannot be persisted"
                    />
                  ) : mutation.error instanceof FacilityRequestError && mutation.error.status === 409 ? (
                    <FormattedMessage
                      id="facilities.commandConflict"
                      defaultMessage="This application changed. Review the refreshed case before trying again; no new decision has been confirmed."
                      description="Revision-bound command conflict"
                    />
                  ) : (
                    <FormattedMessage
                      id="facilities.commandError"
                      defaultMessage="The action could not be confirmed. Refresh to check its status before retrying."
                      description="Uncertain operator command result, not success"
                    />
                  )}
                </p>
              )}
              {recovery && (
                <section className="rounded-lg border border-border p-4">
                  <p className="text-sm">
                    <FormattedMessage
                      id="facilities.recoveryHint"
                      defaultMessage="Your previous assessment request is unfinished or unconfirmed. Retry resumes the same request; it does not start a second assessment."
                      description="Recovery remains available while the backend retains its pending command lock"
                    />
                  </p>
                  <Button
                    className="mt-3"
                    variant="outline"
                    disabled={!live || mutation.isPending}
                    onClick={() => {
                      void handleCommand(recovery).catch(() => {
                        /* Mutation state displays the request error. */
                      });
                    }}
                  >
                    <FormattedMessage
                      id="facilities.retryAssessment"
                      defaultMessage="Retry assessment"
                      description="Replay the original operator-bound command id and submission digest"
                    />
                  </Button>
                </section>
              )}
              <FacilityCase key={app.id} application={app} live={live && !recovery} busy={mutation.isPending} onCommand={handleCommand} />
            </div>
          ) : (
            <div role="alert" className="rounded-lg border border-border p-6">
              <FormattedMessage
                id="facilities.notFound"
                defaultMessage="This application is not available. Return to the application list."
                description="A stale or unknown deep link does not show a different case"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
