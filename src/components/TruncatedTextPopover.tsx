import * as React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { truncateString } from "@/utils/strings";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useIntl } from "react-intl";

interface TruncatedTextPopoverProps {
  text: React.ReactNode;
  maxLength?: number;
  showFullOnDesktop?: boolean;
  className?: string;
  contentClassName?: string;
  title?: string;
  as?: "button" | "span";
  showCopyButton?: boolean;
}

function useResponsiveMaxLength(
  maxLength: number,
  showFullOnDesktop: boolean,
): number {
  const [effectiveMaxLength, setEffectiveMaxLength] = React.useState(maxLength);

  React.useEffect(() => {
    const calculateMaxLength = () => {
      // Use document.documentElement.clientWidth for more accurate width
      // This excludes scrollbar and respects the actual viewport
      const width = document.documentElement.clientWidth || window.innerWidth;

      // Modern touch device detection using multiple signals
      const isTouchDevice =
        window.matchMedia("(pointer: coarse)").matches ||
        navigator.maxTouchPoints > 0 ||
        "ontouchstart" in window;

      // If showFullOnDesktop is true and we're on a large screen without touch, skip truncation
      if (showFullOnDesktop && width >= 1024 && !isTouchDevice) {
        setEffectiveMaxLength(Infinity);
        return;
      }

      // Define breakpoints and scaling factors based on viewport width
      // Touch devices get more aggressive truncation at larger widths
      if (width < 480) {
        // Extra small mobile: reduce to 30% of maxLength
        setEffectiveMaxLength(Math.max(12, Math.floor(maxLength * 0.3)));
      } else if (width < 768) {
        // Small mobile/tablet: reduce to 50% of maxLength
        setEffectiveMaxLength(Math.max(16, Math.floor(maxLength * 0.5)));
      } else if (width < 1024) {
        // Tablet/small desktop: reduce to 70% of maxLength
        setEffectiveMaxLength(Math.max(16, Math.floor(maxLength * 0.7)));
      } else if (width < 1440) {
        // Medium desktop: reduce to 90% of maxLength
        setEffectiveMaxLength(Math.max(24, Math.floor(maxLength * 0.9)));
      } else {
        // Large desktop: use full maxLength
        setEffectiveMaxLength(maxLength);
      }
    };

    calculateMaxLength();
    window.addEventListener("resize", calculateMaxLength);
    return () => window.removeEventListener("resize", calculateMaxLength);
  }, [maxLength, showFullOnDesktop]);

  return effectiveMaxLength;
}

function extractTextFromNode(node: unknown): string {
  if (node == null) {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((n) => extractTextFromNode(n)).join("");
  }

  if (React.isValidElement(node)) {
    const el = node as React.ReactElement<{ children?: React.ReactNode }>;
    return extractTextFromNode(el.props.children);
  }

  return "";
}

export function TruncatedTextPopover({
  text,
  maxLength = 24,
  showFullOnDesktop = false,
  className,
  contentClassName,
  title,
  as = "button",
  showCopyButton = false,
}: TruncatedTextPopoverProps) {
  const intl = useIntl();
  const effectiveMaxLength = useResponsiveMaxLength(
    maxLength,
    showFullOnDesktop,
  );
  const [copied, setCopied] = React.useState(false);

  const textStr = extractTextFromNode(text);
  const rawLines = textStr.split(/\r?\n/);
  const lines = rawLines.map((l) => l.replace(/\s+$/g, ""));
  const needsTruncation = lines.some(
    (line) => line.length > effectiveMaxLength,
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textStr);
      setCopied(true);
      toast.success(
        intl.formatMessage({
          id: "truncatedTextPopover.copied",
          defaultMessage: "Copied to clipboard",
        }),
      );
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
      toast.error(
        intl.formatMessage({
          id: "truncatedTextPopover.copyFailed",
          defaultMessage: "Failed to copy to clipboard",
        }),
      );
    }
  };
  const flatLabel = lines.join(", ");
  const truncatedLines = needsTruncation
    ? lines.map((line) => truncateString(line, effectiveMaxLength))
    : lines;

  if (!needsTruncation && !showCopyButton) {
    return (
      <span
        className={cn("whitespace-pre-line", className)}
        title={title ?? flatLabel}
      >
        {text}
      </span>
    );
  }

  const TriggerTag = as;

  const popoverContent = (
    <Popover>
      <PopoverTrigger asChild>
        <TriggerTag
          {...(as === "button" ? { type: "button" as const } : {})}
          className={cn(
            "cursor-pointer text-left hover:underline focus:outline-none bg-transparent !text-inherit leading-none",
            needsTruncation && "truncate",
            className,
          )}
          title={title ?? flatLabel}
          aria-label={title ?? flatLabel}
        >
          {needsTruncation ? (
            truncatedLines.map((line, i) => (
              <span
                key={i}
                className="truncate block w-full"
              >
                {line}
              </span>
            ))
          ) : (
            <span className="whitespace-pre-line">{text}</span>
          )}
        </TriggerTag>
      </PopoverTrigger>

      <PopoverContent
        align="center"
        sideOffset={6}
        collisionPadding={16}
        className={cn(
          "z-50 break-all text-center p-4 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          contentClassName,
        )}
      >
        <span className="text-sm whitespace-pre-line">{textStr}</span>
      </PopoverContent>
    </Popover>
  );

  if (showCopyButton) {
    return (
      <div className="flex items-center gap-2">
        {popoverContent}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => void handleCopy()}
          className="h-6 w-6 shrink-0"
          title={
            copied
              ? intl.formatMessage({
                  id: "truncatedTextPopover.copiedShort",
                  defaultMessage: "Copied!",
                })
              : intl.formatMessage({
                  id: "truncatedTextPopover.copyAction",
                  defaultMessage: "Copy to clipboard",
                })
          }
          aria-label={
            copied
              ? intl.formatMessage({
                  id: "truncatedTextPopover.copiedShort",
                  defaultMessage: "Copied!",
                })
              : intl.formatMessage({
                  id: "truncatedTextPopover.copyAction",
                  defaultMessage: "Copy to clipboard",
                })
          }
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  }

  return popoverContent;
}
