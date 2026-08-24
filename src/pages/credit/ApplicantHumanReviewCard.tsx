import { useState } from "react";
import { Button, toast } from "@bitcredit/ui-library";
import { useQueryClient } from "@tanstack/react-query";
import { useIntl } from "react-intl";

import type { ApplicantHumanReviewRecord, ApplicantHumanReviewResolution } from "./decision-types";
import { recordApplicantHumanReviewUpdate, type OperatorCapability } from "./record-operator-decision";

export function ApplicantHumanReviewCard({
  billId,
  capability,
  review,
}: {
  billId: string;
  capability: OperatorCapability | undefined;
  review: ApplicantHumanReviewRecord;
}) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);
  const [resolution, setResolution] = useState<ApplicantHumanReviewResolution>("decision_upheld");
  const [writtenBasis, setWrittenBasis] = useState("");
  const assignedToCurrentOperator =
    review.status === "in_review" &&
    capability !== undefined &&
    review.reviewer?.reviewerId === capability?.operatorId &&
    review.reviewer.reviewerRole === capability.operatorRole;

  const record = async (action: "begin_review" | "complete_review") => {
    setIsPending(true);
    const result = await recordApplicantHumanReviewUpdate(
      {
        billId,
        caseId: review.request.caseId,
        requestId: review.request.requestId,
        contestedDecisionResultDigest: review.request.contestedDecisionResultDigest,
        action,
        ...(action === "complete_review" ? { resolution, writtenBasis: writtenBasis.trim() } : {}),
      },
      capability
    );
    setIsPending(false);
    if (!result.ok) {
      toast({ title: result.error, variant: "error" });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["ai-credit", "decisions"] });
    toast({
      title:
        action === "begin_review"
          ? intl.formatMessage({
              id: "credit.humanReview.started",
              defaultMessage: "Second review started",
              description: "Confirmation after an operator starts an applicant-requested second review",
            })
          : intl.formatMessage({
              id: "credit.humanReview.completed",
              defaultMessage: "Second review completed",
              description: "Confirmation after an operator completes an applicant-requested second review",
            }),
      variant: "success",
    });
  };

  return (
    <section className="mt-3 rounded-lg border border-signal-alert/40 bg-elevation-100 p-4" aria-labelledby="applicant-human-review-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold" id="applicant-human-review-title">
          {intl.formatMessage({
            id: "credit.humanReview.title",
            defaultMessage: "Applicant requested a second review",
            description: "Heading for an applicant-requested human review on a quote",
          })}
        </h2>
        <span className="text-xs font-medium text-signal-alert">
          {intl.formatMessage(
            {
              id: "credit.humanReview.status",
              defaultMessage: "Status: {status}",
              description: "Current applicant-requested human review status",
            },
            {
              status:
                review.status === "requested"
                  ? intl.formatMessage({
                      id: "credit.humanReview.requested",
                      defaultMessage: "Waiting for reviewer",
                      description: "Status of an applicant-requested second review before assignment",
                    })
                  : review.status === "in_review"
                    ? intl.formatMessage({
                        id: "credit.humanReview.inReview",
                        defaultMessage: "In review",
                        description: "Status of an assigned applicant-requested second review",
                      })
                    : intl.formatMessage({
                        id: "credit.humanReview.done",
                        defaultMessage: "Completed",
                        description: "Status of a completed applicant-requested second review",
                      }),
            }
          )}
        </span>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{review.request.statement}</p>

      {review.status === "requested" ? (
        <div className="mt-4">
          <p className="mb-2 text-xs text-muted-foreground">
            {intl.formatMessage({
              id: "credit.humanReview.differentOperator",
              defaultMessage: "This must be handled by someone other than the original decision operator.",
              description: "Separation-of-duties notice for an applicant-requested second review",
            })}
          </p>
          <Button disabled={capability === undefined || isPending} onClick={() => void record("begin_review")} size="sm">
            {intl.formatMessage({
              id: "credit.humanReview.begin",
              defaultMessage: "Start second review",
              description: "Action for a different operator to begin an applicant-requested review",
            })}
          </Button>
        </div>
      ) : review.status === "in_review" ? (
        assignedToCurrentOperator ? (
          <div className="mt-4 space-y-3">
            <label className="block text-sm font-medium" htmlFor="human-review-resolution">
              {intl.formatMessage({
                id: "credit.humanReview.resolution",
                defaultMessage: "Review result",
                description: "Label for the result of an applicant-requested second review",
              })}
            </label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              id="human-review-resolution"
              onChange={(event) => {
                const value = event.currentTarget.value;
                if (value === "decision_upheld" || value === "correction_or_reassessment_required") setResolution(value);
              }}
              value={resolution}
            >
              <option value="decision_upheld">
                {intl.formatMessage({
                  id: "credit.humanReview.upheld",
                  defaultMessage: "Decision upheld",
                  description: "Second-review result when the original decision remains in place",
                })}
              </option>
              <option value="correction_or_reassessment_required">
                {intl.formatMessage({
                  id: "credit.humanReview.reassess",
                  defaultMessage: "Correction required",
                  description: "Second-review result requiring the applicant to correct and resubmit the same governed case",
                })}
              </option>
            </select>
            <label className="block text-sm font-medium" htmlFor="human-review-basis">
              {intl.formatMessage({
                id: "credit.humanReview.basis",
                defaultMessage: "Written review basis",
                description: "Label for the attributable written basis of a second review",
              })}
            </label>
            <textarea
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              id="human-review-basis"
              maxLength={2_000}
              onChange={(event) => setWrittenBasis(event.target.value)}
              value={writtenBasis}
            />
            <Button disabled={isPending || writtenBasis.trim().length < 20} onClick={() => void record("complete_review")} size="sm">
              {intl.formatMessage({
                id: "credit.humanReview.complete",
                defaultMessage: "Complete second review",
                description: "Action to persist the outcome and written basis of a second review",
              })}
            </Button>
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            {intl.formatMessage(
              {
                id: "credit.humanReview.assigned",
                defaultMessage: "Assigned to {reviewer}.",
                description: "Attribution shown while another operator owns a second review",
              },
              { reviewer: review.reviewer?.reviewerId ?? "—" }
            )}
          </p>
        )
      ) : (
        <div className="mt-3 text-sm">
          <p className="font-medium">
            {review.resolution === "decision_upheld"
              ? intl.formatMessage({
                  id: "credit.humanReview.upheld",
                  defaultMessage: "Decision upheld",
                  description: "Second-review result when the original decision remains in place",
                })
              : intl.formatMessage({
                  id: "credit.humanReview.reassess",
                  defaultMessage: "Correction required",
                  description: "Second-review result requiring the applicant to correct and resubmit the same governed case",
                })}
          </p>
          <p className="mt-1 text-muted-foreground">{review.writtenBasis}</p>
        </div>
      )}
    </section>
  );
}
