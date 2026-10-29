import { useLayoutEffect, type ReactNode, type RefObject } from "react";
import { ArrowUp, LoaderCircle } from "lucide-react";

/**
 * One surface: the question, then a quiet toolbar (model, limits) and a round send button.
 * Enter sends, Shift+Enter breaks the line; the field grows with the question up to a bound.
 */
export function ChatComposer({
  id,
  inputRef,
  value,
  onChange,
  onSubmit,
  label,
  placeholder,
  sendLabel,
  canSend,
  busy,
  disabled,
  toolbar,
  status,
}: {
  id: string;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  label: string;
  placeholder: string;
  sendLabel: string;
  canSend: boolean;
  busy: boolean;
  disabled?: boolean;
  toolbar?: ReactNode;
  status?: ReactNode;
}) {
  useLayoutEffect(() => {
    const field = inputRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${String(Math.min(field.scrollHeight, 176))}px`;
  }, [inputRef, value]);
  return (
    <form
      className="chat-composer"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      onMouseDown={(event) => {
        // The whole surface is one control: clicks on its padding focus the question.
        if ((event.target as HTMLElement).closest("button, a, textarea, [role='menuitem']")) return;
        event.preventDefault();
        inputRef.current?.focus();
      }}
    >
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        ref={inputRef}
        value={value}
        rows={1}
        maxLength={1000}
        disabled={disabled}
        placeholder={placeholder}
        className="chat-composer-input"
        onChange={(event) => {
          onChange(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            onSubmit();
          }
        }}
      />
      <div className="chat-composer-toolbar">
        <div className="flex min-w-0 flex-1 items-center gap-1">{toolbar}</div>
        {status}
        <button type="submit" className="chat-send" disabled={!canSend} aria-label={sendLabel}>
          {busy ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" /> : <ArrowUp className="size-4" />}
        </button>
      </div>
    </form>
  );
}
