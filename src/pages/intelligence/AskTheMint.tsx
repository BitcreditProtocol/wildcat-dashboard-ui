import { useEffect, useRef, useState, useId } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@bitcredit/ui-library";
import {
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  CornerDownRight,
  FileText,
  Gauge,
  Globe,
  ListTodo,
  MessageSquarePlus,
  Network,
  RotateCcw,
  Scale,
  Sparkles,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { useIntl } from "react-intl";
import { Link } from "react-router";
import { BoundaryNotice } from "@/components/operator/BoundaryNotice";
import { useMintIntelligence } from "@/pages/mint-checks/api";
import { useMintSummary } from "@/pages/home/operator-api";
import { cockpit } from "@/components/operator/cockpit-messages";
import {
  citationLocation,
  MintChatError,
  useAskMint,
  useMintDiscussion,
  type CitationKind,
  type MintAnswer,
  type MintQuestion,
} from "./mint-discussion-api";
import { MintMarkdown } from "./MintMarkdown";
import { mintChatMessages as m } from "./mint-chat-copy";
import { ChatComposer } from "./chat/ChatComposer";
import { ModelPicker } from "./chat/ModelPicker";
import { modelLabel, preferredModel, rememberModel } from "./chat/model-label";

const sourceIcon: Record<CitationKind, typeof BookOpen> = {
  "intelligence-note": BookOpen,
  policy: Scale,
  outcomes: TrendingUp,
  portfolio: FileText,
  queue: ListTodo,
  federation: Network,
  capacity: Gauge,
  "general-knowledge": Globe,
};

function CopyAnswer({ text }: { text: string }) {
  const intl = useIntl();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="chat-icon-button"
      aria-label={intl.formatMessage(copied ? m.copied : m.copy)}
      title={intl.formatMessage(copied ? m.copied : m.copy)}
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => {
            setCopied(false);
          }, 1500);
        });
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}

function Answer({ answer, model }: { answer: MintAnswer; model?: string }) {
  const intl = useIntl();
  const notes = useMintIntelligence();
  return (
    <article className="chat-answer">
      <MintMarkdown text={answer.answer} />
      {answer.citations.some((c) => c.kind === "general-knowledge" && !c.label) && (
        <p className="chat-general">{intl.formatMessage(m.general)}</p>
      )}
      {answer.citations.length > 0 && (
        <ul aria-label={intl.formatMessage(m.sources)} className="chat-sources">
          {answer.citations.map((c, i) => {
            const href = citationLocation(c);
            const note = c.kind === "intelligence-note" ? notes.data?.notes.find((n) => n.id === c.ref) : undefined;
            const label = c.label ?? note?.title ?? intl.formatMessage(m[c.kind]);
            const Icon = sourceIcon[c.kind];
            return (
              <li key={`${c.kind}:${c.ref ?? i}`}>
                {href ? (
                  <Link className="chat-source" to={href}>
                    <Icon aria-hidden="true" />
                    {label}
                  </Link>
                ) : (
                  <span className="chat-source chat-source-static">
                    <Icon aria-hidden="true" />
                    {label}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className="chat-answer-meta">
        <CopyAnswer text={answer.answer} />
        {model && <span>{modelLabel(model)}</span>}
      </div>
    </article>
  );
}

/**
 * Ask the Mint: a read-only explanation of this Mint's records. The page hosts it full height;
 * the ⌘K drawer hosts the same conversation.
 */
export function AskTheMint({ variant = "page" }: { variant?: "page" | "drawer" }) {
  const intl = useIntl();
  const questionId = useId();
  const history = useMintDiscussion();
  const ask = useAskMint();
  const summary = useMintSummary();
  const [threadId, setThreadId] = useState<string>();
  const [draft, setDraft] = useState("");
  const [retry, setRetry] = useState<MintQuestion>();
  const [model, setModel] = useState<string>();
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(Date.now());
  const input = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const models = history.data?.models;
  const chosenModel = model !== undefined && models?.options.includes(model) ? model : preferredModel(models);
  // Most recently active conversation first.
  const threads = [...new Set([...(history.data?.records ?? [])].reverse().map((r) => r.threadId))];
  const selected = threadId ?? threads[0];
  const records = history.data?.records.filter((r) => r.threadId === selected) ?? [];
  const pending = ask.isPending || records.some((r) => r.status === "pending");
  const lastAnswer = records[records.length - 1]?.answer;
  const pendingAt = records.find((r) => r.status === "pending")?.requestedAt;
  const fixedModel = [...(history.data?.records ?? [])].reverse().find((r) => r.model)?.model;
  useEffect(() => {
    if (!pending) return;
    const start = pendingAt ? Date.parse(pendingAt) : startedAt.current;
    const tick = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    };
    const timer = window.setInterval(tick, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [pending, pendingAt]);
  const topBuyer = summary.error
    ? undefined
    : summary.data?.portfolio.counterparties
        .filter((p) => p.role === "drawee")
        .sort((a, b) => (BigInt(a.usedSat) > BigInt(b.usedSat) ? -1 : 1))[0];
  const examples = [
    intl.formatMessage(m.exampleMaturity),
    topBuyer ? intl.formatMessage(cockpit.questionBook, { buyer: topBuyer.name }) : intl.formatMessage(m.exampleExposure),
    intl.formatMessage((summary.data?.queue.length ?? 0) > 0 ? cockpit.questionQueue : m.exampleHarvest),
    ...(topBuyer?.capSat ? [intl.formatMessage(cockpit.questionLimit)] : []),
  ];
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
    const next: MintQuestion =
      retry?.question === question.trim()
        ? retry
        : {
            threadId: selected ?? crypto.randomUUID(),
            requestId: crypto.randomUUID(),
            question: question.trim(),
            // Only a Mint that offers a choice is told one; older Mints reject unknown fields.
            ...(models && chosenModel ? { model: chosenModel } : {}),
          };
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
  const startNew = () => {
    setThreadId(crypto.randomUUID());
    setDraft("");
    setRetry(undefined);
    ask.reset();
    input.current?.focus();
  };
  const pick = (question: string) => {
    setDraft(question);
    input.current?.focus();
  };
  const empty = records.length === 0 && !pending;
  const others = threads.filter((id) => id !== selected);
  const composer = (
    <ChatComposer
      id={questionId}
      inputRef={input}
      value={draft}
      onChange={setDraft}
      onSubmit={() => {
        send(draft);
      }}
      label={intl.formatMessage(m.input)}
      placeholder={intl.formatMessage(m.placeholder)}
      sendLabel={intl.formatMessage(m.send)}
      canSend={!pending && Boolean(draft.trim()) && !unavailable}
      busy={pending}
      disabled={pending}
      toolbar={
        <ModelPicker
          value={chosenModel}
          options={models?.options ?? []}
          fallback={models?.default ?? fixedModel}
          disabled={pending}
          onChange={(id) => {
            setModel(id);
            rememberModel(id);
          }}
        />
      }
      status={
        history.data && (
          <span className="chat-limit" title={intl.formatMessage(m.limitWhy)}>
            {intl.formatMessage(m.limit, { used: history.data.limits.usedToday, limit: history.data.limits.daily })}
          </span>
        )
      }
    />
  );
  const notices = (
    <>
      {unavailable && (
        <p role="status" className="chat-notice">
          <TriangleAlert className="size-3.5 shrink-0" />
          {intl.formatMessage(m.unavailable)}
        </p>
      )}
      {ask.error && (
        <div role="alert" className="chat-notice">
          <TriangleAlert className="size-3.5 shrink-0" />
          <p className="min-w-0 flex-1">{intl.formatMessage(errorMessage)}</p>
          {retry && (
            <button
              type="button"
              className="chat-notice-action"
              disabled={pending}
              onClick={() => {
                send(retry.question);
              }}
            >
              <RotateCcw className="size-3" />
              {intl.formatMessage(m.retry)}
            </button>
          )}
        </div>
      )}
    </>
  );
  return (
    <section id="ask-the-mint" aria-label={intl.formatMessage(m.title)} className={`mint-chat mint-chat-${variant}`}>
      <h2 className="sr-only">{intl.formatMessage(m.title)}</h2>
      {(others.length > 0 || !empty) && (
        <div className="mint-chat-bar">
          {others.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild disabled={pending}>
                <button type="button" className="chat-control max-w-[min(28rem,70%)]" aria-label={intl.formatMessage(m.history)}>
                  <span className="truncate">{records[0]?.question ?? intl.formatMessage(m.conversations)}</span>
                  <ChevronDown className="chat-control-chevron" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80">
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  {intl.formatMessage(m.conversations)}
                </DropdownMenuLabel>
                {threads.map((id) => (
                  <DropdownMenuItem
                    key={id}
                    onSelect={() => {
                      setThreadId(id);
                      setRetry(undefined);
                      ask.reset();
                    }}
                    className={id === selected ? "font-medium" : ""}
                  >
                    <span className="truncate">{history.data?.records.find((r) => r.threadId === id)?.question}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={startNew}>
                  <MessageSquarePlus className="size-4" />
                  {intl.formatMessage(m.newThread)}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span />
          )}
          {!empty && (
            <button type="button" className="chat-control" disabled={pending} onClick={startNew}>
              <MessageSquarePlus aria-hidden="true" />
              {intl.formatMessage(m.newThread)}
            </button>
          )}
        </div>
      )}
      <div
        className="mint-chat-scroll"
        role="log"
        aria-label={intl.formatMessage(m.history)}
        aria-live="polite"
        aria-relevant="additions text"
      >
        {empty ? (
          <div className="mint-chat-empty">
            <span className="mint-chat-glyph" aria-hidden="true">
              <Sparkles className="size-5" />
            </span>
            <h3 className="text-xl font-semibold tracking-tight">{intl.formatMessage(m.emptyTitle)}</h3>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{intl.formatMessage(m.emptyBody)}</p>
            <div className="mint-chat-dock mt-4 w-full">
              {notices}
              {composer}
            </div>
            <div className="chat-suggestions">
              {examples.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="chat-suggestion"
                  onClick={() => {
                    pick(q);
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
            {variant === "page" && <p className="mt-2 text-xs text-muted-foreground">{intl.formatMessage(m.caseHint)}</p>}
          </div>
        ) : (
          <ol className="mint-chat-thread">
            {records.map((r) => (
              <li key={r.requestId} className="flex flex-col gap-4">
                <p className="chat-question">{r.question}</p>
                {r.answer ? (
                  <Answer answer={r.answer} model={r.model} />
                ) : r.status === "failed" ? (
                  <p className="chat-failed">
                    <TriangleAlert className="size-3.5 shrink-0" />
                    {intl.formatMessage(m.failed)}
                  </p>
                ) : null}
              </li>
            ))}
            {pending && (
              <li role="status" className="chat-pending">
                <span className="chat-shimmer">{intl.formatMessage(m.pending)}</span>
                <span className="text-xs text-muted-foreground">
                  {intl.formatMessage(m.pendingDetail)}{" "}
                  <span aria-live="off" className="tabular-nums">
                    {intl.formatMessage(m.elapsed, { seconds: elapsed })}
                  </span>
                </span>
              </li>
            )}
            {lastAnswer && !pending && lastAnswer.followUps.length > 0 && (
              <li className="chat-follow-ups" aria-label={intl.formatMessage(m.followUps)}>
                {lastAnswer.followUps.slice(0, 3).map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="chat-follow-up"
                    onClick={() => {
                      pick(q);
                    }}
                  >
                    <CornerDownRight className="size-3.5 shrink-0" aria-hidden="true" />
                    {q}
                  </button>
                ))}
              </li>
            )}
          </ol>
        )}
        <div ref={end} />
      </div>
      {!empty && (
        <div className="mint-chat-dock">
          {notices}
          {composer}
        </div>
      )}
      <div className="mint-chat-boundary">
        <BoundaryNotice summary={intl.formatMessage(m.label)}>{intl.formatMessage(m.boundary)}</BoundaryNotice>
      </div>
    </section>
  );
}
