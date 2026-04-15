import * as React from "react";

import { extractTextFromNode, getTruncatedTextState } from "@/components/truncated-text";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TruncatedLinkPopoverProps {
  href: string;
  text?: React.ReactNode;
  maxLength?: number;
  className?: string;
  contentClassName?: string;
  title?: string;
  hoverOpenDelay?: number;
  pressOpenDelay?: number;
  target?: React.HTMLAttributeAnchorTarget;
  rel?: string;
}

export function TruncatedLinkPopover({
  href,
  text,
  maxLength,
  className,
  contentClassName,
  title,
  hoverOpenDelay = 400,
  pressOpenDelay = 400,
  target = "_blank",
  rel = "noopener noreferrer",
}: TruncatedLinkPopoverProps) {
  const triggerRef = React.useRef<HTMLAnchorElement | null>(null);
  const hoverTimeoutRef = React.useRef<number | null>(null);
  const pressTimeoutRef = React.useRef<number | null>(null);
  const openedByLongPressRef = React.useRef(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [hasWidthOverflow, setHasWidthOverflow] = React.useState(false);
  const displayText = text ?? href;
  const textStr = extractTextFromNode(displayText);
  const { flatLabel, hasComputedTruncation, hasLengthFallbackOverflow, visibleLines } = getTruncatedTextState(displayText, maxLength);

  const clearHoverTimeout = React.useCallback(() => {
    if (hoverTimeoutRef.current !== null) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const clearPressTimeout = React.useCallback(() => {
    if (pressTimeoutRef.current !== null) {
      window.clearTimeout(pressTimeoutRef.current);
      pressTimeoutRef.current = null;
    }
  }, []);

  const scheduleOpen = React.useCallback(() => {
    clearHoverTimeout();
    hoverTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(true);
      hoverTimeoutRef.current = null;
    }, hoverOpenDelay);
  }, [clearHoverTimeout, hoverOpenDelay]);

  const closePopover = React.useCallback(() => {
    clearHoverTimeout();
    clearPressTimeout();
    openedByLongPressRef.current = false;
    setIsOpen(false);
  }, [clearHoverTimeout, clearPressTimeout]);

  const startPressOpen = React.useCallback(() => {
    clearPressTimeout();
    openedByLongPressRef.current = false;
    pressTimeoutRef.current = window.setTimeout(() => {
      openedByLongPressRef.current = true;
      setIsOpen(true);
      pressTimeoutRef.current = null;
    }, pressOpenDelay);
  }, [clearPressTimeout, pressOpenDelay]);

  const stopPressOpen = React.useCallback(() => {
    clearPressTimeout();
  }, [clearPressTimeout]);

  React.useEffect(() => {
    return () => {
      clearHoverTimeout();
      clearPressTimeout();
    };
  }, [clearHoverTimeout, clearPressTimeout]);

  React.useEffect(() => {
    if (!isOpen) {
      openedByLongPressRef.current = false;
    }
  }, [isOpen]);

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
  const visibleTextNode = visibleLines.map((line) => (
    <span key={line} data-truncated-text-line className="block w-full min-w-0 max-w-full truncate">
      {line}
    </span>
  ));

  const resolvedTitle = shouldShowPopover ? undefined : (title ?? flatLabel);

  if (!shouldShowPopover) {
    return (
      <a
        ref={triggerRef}
        href={href}
        target={target}
        rel={rel}
        className={cn("block w-full min-w-0 max-w-full overflow-hidden align-top hover:underline focus:outline-none", className)}
        title={resolvedTitle}
        aria-label={title ?? flatLabel}
      >
        {visibleTextNode}
      </a>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverAnchor asChild>
        <a
          ref={triggerRef}
          href={href}
          target={target}
          rel={rel}
          className={cn("block w-full min-w-0 max-w-full overflow-hidden align-top hover:underline focus:outline-none", className)}
          aria-label={title ?? flatLabel}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          onMouseEnter={scheduleOpen}
          onMouseLeave={closePopover}
          onPointerDown={startPressOpen}
          onPointerUp={stopPressOpen}
          onPointerCancel={stopPressOpen}
          onFocus={() => {
            setIsOpen(true);
          }}
          onBlur={closePopover}
          onClick={(event) => {
            if (openedByLongPressRef.current) {
              event.preventDefault();
              event.stopPropagation();
              openedByLongPressRef.current = false;
            }
          }}
        >
          {visibleTextNode}
        </a>
      </PopoverAnchor>

      <PopoverContent
        align="center"
        sideOffset={6}
        collisionPadding={16}
        className={cn(
          "z-50 break-all rounded-lg border border-[#1B0F004D] bg-elevation-50 p-4 text-center shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          contentClassName
        )}
      >
        <span className="text-sm whitespace-pre-line">{textStr}</span>
      </PopoverContent>
    </Popover>
  );
}
