import { BaseDrawer } from "@/components/Drawers";
import { Button } from "@bitcredit/ui-library";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { defineMessages, useIntl } from "react-intl";
import type { DecisionCase } from "./decision-types";

import { discussionAttempt, discussionRequest, sources, type DiscussionAttempt } from "./case-agent-discussion";
const messages = defineMessages({
  ask: {
    id: "credit.agent.ask",
    defaultMessage: "Ask the agent",
    description: "Read-only questions to the case explanation agent, not the applicant",
  },
  scope: {
    id: "credit.agent.scope",
    defaultMessage: "Existing case records only. Saved on the server. No applicant contact or effect on approval.",
    description: "Scope and retention of the separate operator discussion",
  },
  input: { id: "credit.agent.input", defaultMessage: "Question about this case", description: "Operator question to the agent" },
  send: { id: "credit.agent.send", defaultMessage: "Ask agent", description: "Send only to the read-only agent" },
  pending: { id: "credit.agent.pending", defaultMessage: "Reading the case…", description: "Case explanation in progress" },
  failed: {
    id: "credit.agent.failed",
    defaultMessage: "No answer was produced. You can try another question. The case is unchanged.",
    description: "Failed explanation is not a case failure",
  },
  unavailable: {
    id: "credit.agent.unavailable",
    defaultMessage: "Discussion unavailable. Your case has not changed.",
    description: "Agent endpoint failed; do not imply an applicant request was sent",
  },
  label: {
    id: "credit.agent.label",
    defaultMessage: "Agent explanation · not verification",
    description: "Model prose has no financial or evidence authority",
  },
  previous: {
    id: "credit.agent.previous",
    defaultMessage: "Earlier assessment",
    description: "The answer belongs to a previous immutable result",
  },
  assessment: { id: "credit.agent.source.assessment", defaultMessage: "Assessment", description: "Source record link" },
  bill: { id: "credit.agent.source.bill", defaultMessage: "eBill", description: "Source record link" },
  applicant: { id: "credit.agent.source.applicant", defaultMessage: "Applicant statements", description: "Source record link" },
  invoice: { id: "credit.agent.source.invoice", defaultMessage: "Invoice checks", description: "Source record link" },
  preparation: { id: "credit.agent.source.preparation", defaultMessage: "Preparation", description: "Source record link" },
});

export function CaseAgentDiscussion({ decisionCase }: { decisionCase: DecisionCase }) {
  const intl = useIntl();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const retry = useRef<DiscussionAttempt | undefined>(undefined);
  const binding = { billId: decisionCase.snapshot.bill?.billId, caseId: decisionCase.snapshot.caseId };
  const queryKey = ["operator-discussion", binding.billId, binding.caseId];
  const query = useQuery({
    queryKey,
    queryFn: () => discussionRequest({ action: "read", ...binding }),
    enabled: open && binding.billId !== undefined,
    retry: false,
    refetchInterval: (query) => (query.state.data?.some((record) => record.status === "pending") ? 2000 : false),
  });
  const mutation = useMutation({
    mutationFn: () => {
      retry.current = discussionAttempt(retry.current, question, decisionCase.resultDigest);
      return discussionRequest({ action: "ask", ...binding, ...retry.current });
    },
    onSuccess: (records) => {
      client.setQueryData(queryKey, records);
      setQuestion("");
      retry.current = undefined;
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey });
    },
  });
  const pending = mutation.isPending || (query.data?.some((record) => record.status === "pending") ?? false);
  return (
    <BaseDrawer
      open={open}
      onOpenChange={setOpen}
      title={intl.formatMessage(messages.ask)}
      description={intl.formatMessage(messages.scope)}
      trigger={<Button variant="outline">{intl.formatMessage(messages.ask)}</Button>}
    >
      <div className="space-y-4 px-4 pb-4">
        <ol className="space-y-5" aria-live="polite">
          {query.data?.map((record) => (
            <li key={record.requestId} className="space-y-2 border-b border-border pb-4">
              <p className="text-sm font-medium break-words">{record.question}</p>
              <p className="text-xs text-muted-foreground">
                {intl.formatMessage(messages.label)}
                {record.resultDigest !== decisionCase.resultDigest && ` · ${intl.formatMessage(messages.previous)}`}
              </p>
              <p className="whitespace-pre-wrap break-words text-sm">
                {record.answer?.answer ?? intl.formatMessage(record.status === "pending" ? messages.pending : messages.failed)}
              </p>
              {record.answer && record.resultDigest === decisionCase.resultDigest && (
                <div className="flex flex-wrap gap-3">
                  {record.answer.sources.map((source) => (
                    <a key={source} href={sources[source]} onClick={() => setOpen(false)} className="text-xs text-primary underline">
                      {intl.formatMessage(messages[source])}
                    </a>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>
        {(query.isError || mutation.isError) && (
          <p role="alert" className="text-sm text-signal-alert">
            {intl.formatMessage(messages.unavailable)}
          </p>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!pending && question.trim()) mutation.mutate();
          }}
          className="space-y-3"
        >
          <label htmlFor="case-agent-question" className="block text-sm">
            {intl.formatMessage(messages.input)}
          </label>
          <input
            id="case-agent-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={500}
            disabled={pending}
            className="w-full rounded-md border border-input bg-background p-3 text-sm"
          />
          <Button type="submit" disabled={pending || query.isLoading || !question.trim()}>
            {intl.formatMessage(pending ? messages.pending : messages.send)}
          </Button>
        </form>
      </div>
    </BaseDrawer>
  );
}
