import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@bitcredit/ui-library";
import { ChevronDown, Cpu } from "lucide-react";
import { useIntl } from "react-intl";
import { mintChatMessages as m } from "../mint-chat-copy";
import { modelLabel } from "./model-label";

/** A quiet composer control. With one model there is nothing to choose, so it only names it. */
export function ModelPicker({
  value,
  options,
  fallback,
  disabled,
  onChange,
}: {
  value: string | undefined;
  options: string[];
  fallback: string | undefined;
  disabled?: boolean;
  onChange: (id: string) => void;
}) {
  const intl = useIntl();
  const current = value ?? fallback;
  if (options.length < 2) {
    return current ? (
      <span className="chat-control chat-control-static" title={intl.formatMessage(m.modelFixed)}>
        <Cpu aria-hidden="true" />
        {modelLabel(current)}
      </span>
    ) : null;
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button type="button" className="chat-control" aria-label={intl.formatMessage(m.model, { model: modelLabel(current ?? "") })}>
          <Cpu aria-hidden="true" />
          {modelLabel(current ?? "")}
          <ChevronDown className="chat-control-chevron" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="min-w-56">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{intl.formatMessage(m.modelMenu)}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={current} onValueChange={onChange}>
          {options.map((id) => (
            <DropdownMenuRadioItem key={id} value={id} className="flex items-baseline justify-between gap-4">
              <span>{modelLabel(id)}</span>
              {id === fallback && <span className="text-[11px] text-muted-foreground">{intl.formatMessage(m.modelDefault)}</span>}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
