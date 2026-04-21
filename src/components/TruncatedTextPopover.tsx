import * as React from "react";
import { extractTextFromNode, getTruncatedTextState } from "@/components/truncated-text";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Copy, Check } from "lucide-react";
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

function useResponsiveMaxLength(maxLength: number, showFullOnDesktop: boolean): number {
  const [effectiveMaxLength, setEffectiveMaxLength] = React.useState(maxLength);

  React.useEffect(() => {
    const calculateMaxLength = () => {
      // Use document.documentElement.clientWidth for more accurate width
      // This excludes scrollbar and respects the actual viewport
      const width = document.documentElement.clientWidth || window.innerWidth;

      // Modern touch device detection using multiple signals
      const isTouchDevice = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0 || "ontouchstart" in window;

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

export function TruncatedTextPopover({
  text,
  maxLength,
  showFullOnDesktop = false,
  className,
  contentClassName,
  title,
  as = "span",
  showCopyButton = false,
}: TruncatedTextPopoverProps) {
  const intl = useIntl();
  const effectiveMaxLength = useResponsiveMaxLength(maxLength ?? 24, showFullOnDesktop);
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const setTriggerRef = React.useCallback((node: HTMLElement | null) => {
    triggerRef.current = node;
  }, []);
  const [hasWidthOverflow, setHasWidthOverflow] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const textStr = extractTextFromNode(text);
  const { flatLabel, hasComputedTruncation, hasLengthFallbackOverflow, visibleLines } = getTruncatedTextState(text, effectiveMaxLength);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textStr);
      setCopied(true);
      toast.success(
        intl.formatMessage({
          id: "truncatedTextPopover.copied",
          defaultMessage: "Copied to clipboard",
        })
      );
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
      toast.error(
        intl.formatMessage({
          id: "truncatedTextPopover.copyFailed",
          defaultMessage: "Failed to copy to clipboard",
        })
      );
    }
  };

  React.useLayoutEffect(() => {
    if (typeof window === "undefined" || hasComputedTruncation) {
      return;
    }

    const element = triggerRef.current;
    if (!element) {
      return;
    }

    const measureOverflow = () => {
      const lineElements = Array.from(element.querySelectorAll<HTMLElement>("[data-truncated-text-line]"));

      if (lineElements.length > 0) {
        setHasWidthOverflow(lineElements.some((lineElement) => lineElement.scrollWidth - lineElement.clientWidth > 1));
        return;
      }

      setHasWidthOverflow(element.scrollWidth - element.clientWidth > 1);
    };

    measureOverflow();

    if (typeof ResizeObserver === "function") {
      const resizeObserver = new ResizeObserver(measureOverflow);
      resizeObserver.observe(element);
      for (const lineElement of element.querySelectorAll<HTMLElement>("[data-truncated-text-line]")) {
        resizeObserver.observe(lineElement);
      }

      return () => {
        resizeObserver.disconnect();
      };
    }

    window.addEventListener("resize", measureOverflow);
    return () => {
      window.removeEventListener("resize", measureOverflow);
    };
  }, [hasComputedTruncation, textStr]);

  const shouldShowPopover = hasComputedTruncation || hasWidthOverflow || hasLengthFallbackOverflow;
  const visibleTextNode = visibleLines.map((line, index) => (
    <span key={`${index}-${line}`} data-truncated-text-line className="block w-full min-w-0 max-w-full truncate">
      {line}
    </span>
  ));

  if (!shouldShowPopover && !showCopyButton) {
    return (
      <span
        ref={setTriggerRef}
        className={cn("block w-full min-w-0 max-w-full overflow-hidden align-top", className)}
        title={title ?? flatLabel}
      >
        {visibleTextNode}
      </span>
    );
  }

  const popoverContent = (
    <Popover>
      <PopoverTrigger asChild>
        {as === "button" ? (
          <button
            ref={setTriggerRef}
            type="button"
            className={cn(
              "block w-full min-w-0 max-w-full overflow-hidden align-top text-left hover:underline focus:outline-none",
              className
            )}
            title={title ?? flatLabel}
            aria-label={title ?? flatLabel}
          >
            {visibleTextNode}
          </button>
        ) : (
          <span
            ref={setTriggerRef}
            role="button"
            tabIndex={0}
            className={cn("block w-full min-w-0 max-w-full overflow-hidden align-top hover:underline focus:outline-none", className)}
            title={title ?? flatLabel}
            aria-label={title ?? flatLabel}
          >
            {visibleTextNode}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="center"
        sideOffset={6}
        collisionPadding={16}
        className={cn(
          "bg-white z-50 break-all rounded-lg border border-[#1B0F004D] p-4 text-center shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          contentClassName
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
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    );
  }

  return popoverContent;
}
