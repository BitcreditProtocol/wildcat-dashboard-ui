import { useEffect, useRef, useState } from "react";
import { Button } from "@bitcredit/ui-library";
import { ArrowUp, ArrowUpRight, BookOpen, LoaderCircle, MessageSquarePlus, Sparkles } from "lucide-react";
import { useIntl } from "react-intl";
import { Link } from "react-router";
import { BoundaryNotice } from "@/components/operator/BoundaryNotice";
import { useMintIntelligence } from "@/pages/mint-checks/api";
import { citationLocation, MintChatError, useAskMint, useMintDiscussion, type MintQuestion } from "./mint-discussion-api";
import { MintMarkdown } from "./MintMarkdown";
import { mintChatMessages as m } from "./mint-chat-copy";

export function AskTheMint() {
  const intl = useIntl();
  const history = useMintDiscussion();
  const ask = useAskMint();
  const notes = useMintIntelligence();
  const [threadId, setThreadId] = useState<string>();
  const [draft, setDraft] = useState("");
  const [retry, setRetry] = useState<MintQuestion>();
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(Date.now());
  const input = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const selected = threadId ?? history.data?.records[history.data.records.length - 1]?.threadId;
  const records = history.data?.records.filter((r) => r.threadId === selected) ?? [];
  const pending = ask.isPending || records.some((r) => r.status === "pending");
  const lastAnswer = records[records.length - 1]?.answer;
  const pendingAt = records.find((r) => r.status === "pending")?.requestedAt;
  useEffect(() => {
    if (!pending) return;
    const start = pendingAt ? Date.parse(pendingAt) : startedAt.current;
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [pending, pendingAt]);
  const examples = [m.exampleMaturity, m.exampleExposure, m.exampleHarvest];
  const errorCode = ask.error instanceof MintChatError ? ask.error.code : "error";
  const errorMessage =
    errorCode === "daily_limit"
      ? m.daily_limit
      : errorCode === "journal_full"
        ? m.journal_full
        : errorCode === "busy"
          ? m.busy
          : errorCode === "request_conflict"
            ? m.request_conflict
            : errorCode === "invalid_answer"
              ? m.invalid_answer
              : m.error;
  const unavailable = history.error !== null && history.data === undefined;
  useEffect(() => {
    if (ask.isSuccess || ask.isPending) end.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [ask.isSuccess, ask.isPending]);
  const send = (question: string) => {
    if (pending || !question.trim()) return;
    const next =
      retry?.question === question.trim()
        ? retry
        : { threadId: selected ?? crypto.randomUUID(), requestId: crypto.randomUUID(), question: question.trim() };
    startedAt.current = Date.now();
    setElapsed(0);
    setThreadId(next.threadId);
    setRetry(next);
    ask.mutate(next, {
      onSuccess: () => {
        setDraft("");
        setRetry(undefined);
      },
    });
  };
  return (
    <section
      id="ask-the-mint"
      aria-label={intl.formatMessage(m.title)}
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-sky-500/10 p-2">
            <Sparkles className="size-5 text-sky-700 dark:text-sky-400" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold">{intl.formatMessage(m.title)}</h2>
            <p className="text-xs text-muted-foreground">{intl.formatMessage(m.subtitle)}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            setThreadId(crypto.randomUUID());
            setDraft("");
            setRetry(undefined);
            ask.reset();
            input.current?.focus();
          }}
        >
          <MessageSquarePlus className="mr-1.5 size-4" />
          {intl.formatMessage(m.newThread)}
        </Button>
      </header>
      <div className="px-5 pt-4">
        <BoundaryNotice summary={intl.formatMessage(m.label)}>{intl.formatMessage(m.boundary)}</BoundaryNotice>
      </div>
      {history.data && new Set(history.data.records.map((r) => r.threadId)).size > 1 && (
        <div className="px-5 pt-3">
          <label className="text-xs text-muted-foreground">
            {intl.formatMessage(m.history)}
            <select
              className="ml-2 max-w-full rounded border border-input bg-background p-1.5"
              disabled={pending}
              value={selected}
              onChange={(event) => {
                setThreadId(event.target.value);
                setRetry(undefined);
                ask.reset();
              }}
            >
              {[...new Set(history.data.records.map((r) => r.threadId))].map((id) => (
                <option key={id} value={id}>
                  {history.data?.records.find((r) => r.threadId === id)?.question.slice(0, 80)}
                </option>
              ))}
              {selected && !history.data.records.some((r) => r.threadId === selected) && (
                <option value={selected}>{intl.formatMessage(m.newThread)}</option>
              )}
            </select>
          </label>
        </div>
      )}
      <div
        className="max-h-[36rem] overflow-y-auto px-5 py-5"
        role="log"
        aria-label={intl.formatMessage(m.history)}
        aria-live="polite"
        aria-relevant="additions text"
      >
        {records.length === 0 && !pending && (
          <div className="mx-auto max-w-2xl py-5">
            <BookOpen className="mb-4 size-7 text-sky-700 dark:text-sky-400" aria-hidden="true" />
            <h3 className="text-xl font-semibold tracking-tight">{intl.formatMessage(m.emptyTitle)}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{intl.formatMessage(m.emptyBody)}</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {examples.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  className="group flex min-h-24 flex-col justify-between gap-3 rounded-lg border border-border p-3 text-left text-xs leading-relaxed hover:border-sky-500 hover:bg-sky-500/5 focus-visible:outline-2 focus-visible:outline-ring"
                  onClick={() => {
                    setDraft(intl.formatMessage(q));
                    input.current?.focus();
                  }}
                >
                  <span>{intl.formatMessage(q)}</span>
                  <ArrowUpRight className="size-3.5 text-muted-foreground group-hover:text-sky-600" />
                </button>
              ))}
            </div>
          </div>
        )}
        <ol className="space-y-6">
          {records.map((r) => (
            <li key={r.requestId} className="space-y-3">
              <div className="ml-auto max-w-[90%] rounded-xl rounded-tr-sm bg-muted px-4 py-3">
                <p className="mb-1 text-[11px] font-semibold text-muted-foreground">{intl.formatMessage(m.you)}</p>
                <p className="whitespace-pre-wrap text-sm">{r.question}</p>
              </div>
              {r.answer ? (
                <article className="max-w-3xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <Sparkles className="size-3.5 text-sky-700 dark:text-sky-400" />
                    {intl.formatMessage(m.title)}
                    <span className="font-normal text-muted-foreground">· {intl.formatMessage(m.label)}</span>
                  </div>
                  <MintMarkdown text={r.answer.answer} />
                  {r.answer.citations.some((c) => c.kind === "general-knowledge" && !c.label) && (
                    <p className="border-l-2 border-amber-500 pl-3 text-xs text-muted-foreground">{intl.formatMessage(m.general)}</p>
                  )}
                  <ul aria-label={intl.formatMessage(m.sources)} className="flex flex-wrap gap-2">
                    {r.answer.citations.map((c, i) => {
                      const href = citationLocation(c);
                      const note = c.kind === "intelligence-note" ? notes.data?.notes.find((n) => n.id === c.ref) : undefined;
                      const label = c.label ?? note?.title ?? intl.formatMessage(m[c.kind]);
                      return (
                        <li key={`${c.kind}:${c.ref ?? i}`}>
                          {href ? (
                            <Link
                              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] hover:border-sky-500 hover:underline"
                              to={href}
                            >
                              <BookOpen className="size-3" />
                              {label}
                              <ArrowUpRight className="size-3" />
                            </Link>
                          ) : (
                            <span className="inline-flex rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
                              {label}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </article>
              ) : r.status === "failed" ? (
                <p className="text-xs text-amber-800 dark:text-amber-300">{intl.formatMessage(m.failed)}</p>
              ) : null}
            </li>
          ))}
        </ol>
        {pending && (
          <div role="status" className="mt-5 rounded-lg border border-sky-500/25 bg-sky-500/5 p-4">
            <p className="flex items-center gap-2 text-sm">
              <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none text-sky-700 dark:text-sky-400" />
              {intl.formatMessage(m.pending)}
            </p>
            <p className="mt-1 pl-6 text-xs text-muted-foreground">{intl.formatMessage(m.pendingDetail)}</p>
            <p aria-live="off" className="mt-2 pl-6 text-xs tabular-nums text-muted-foreground">
              {intl.formatMessage(m.elapsed, { seconds: elapsed })}
            </p>
          </div>
        )}
        <div ref={end} />
      </div>
      {lastAnswer && !pending && (
        <div className="px-5 pb-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{intl.formatMessage(m.followUps)}</p>
          <div className="flex flex-wrap gap-2">
            {lastAnswer.followUps.slice(0, 3).map((q) => (
              <button
                key={q}
                type="button"
                className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                onClick={() => {
                  setDraft(q);
                  input.current?.focus();
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
      <form
        className="border-t border-border bg-muted/20 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
      >
        <label className="sr-only" htmlFor="mint-question">
          {intl.formatMessage(m.input)}
        </label>
        <div className="flex items-end gap-3 rounded-xl border border-input bg-background p-2 focus-within:ring-2 focus-within:ring-ring">
          <textarea
            id="mint-question"
            ref={input}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={1000}
            rows={2}
            className="min-h-14 w-full resize-y bg-transparent p-2 text-sm outline-none"
            placeholder={intl.formatMessage(m.placeholder)}
            disabled={pending}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                send(draft);
              }
            }}
          />
          <Button
            type="submit"
            disabled={pending || !draft.trim() || unavailable}
            className="mb-1 shrink-0"
            aria-label={intl.formatMessage(m.send)}
          >
            <ArrowUp className="size-4" />
          </Button>
        </div>
        {unavailable && (
          <p role="status" className="mt-2 text-xs text-amber-800 dark:text-amber-300">
            {intl.formatMessage(m.unavailable)}
          </p>
        )}
        {ask.error && (
          <div role="alert" className="mt-2 text-xs text-amber-800 dark:text-amber-300">
            <p>{intl.formatMessage(errorMessage)}</p>
            {retry && (
              <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => send(retry.question)}>
                {intl.formatMessage(m.retry)}
              </Button>
            )}
          </div>
        )}
        <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground">
          <p>{intl.formatMessage(m.caseHint)}</p>
          {history.data && <p>{intl.formatMessage(m.limit, { used: history.data.limits.usedToday, limit: history.data.limits.daily })}</p>}
        </div>
      </form>
    </section>
  );
}
