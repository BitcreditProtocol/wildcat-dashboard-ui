import { useEffect } from "react";
import { useLocation } from "react-router";
/** React Router does not scroll to asynchronously loaded fragment targets. Open enclosing disclosures too. */
export function useRevealAnchor(ready: unknown) {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash || !ready) return;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(hash.slice(1));
      if (!target) return;
      for (let node: HTMLElement | null = target; node; node = node.parentElement) if (node instanceof HTMLDetailsElement) node.open = true;
      target.scrollIntoView?.({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [hash, ready]);
}
