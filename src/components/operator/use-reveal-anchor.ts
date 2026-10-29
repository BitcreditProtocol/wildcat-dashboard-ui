import { useEffect } from "react";
import { useLocation } from "react-router";
/** React Router does not scroll to asynchronously loaded fragment targets. Open enclosing disclosures too. */
export function useRevealAnchor(ready: unknown) {
  const { hash } = useLocation();
  useEffect(() => {
    if (!ready) return;
    const reveal = (fragment: string) => {
      if (!fragment) return;
      const target = document.getElementById(fragment.slice(1));
      if (!target) return;
      for (let node: HTMLElement | null = target; node; node = node.parentElement) if (node instanceof HTMLDetailsElement) node.open = true;
      target.scrollIntoView?.({ block: "start" });
    };
    const frame = requestAnimationFrame(() => reveal(hash));
    const click = (event: MouseEvent) => {
      if (event.target instanceof Element) {
        const anchor = event.target.closest("a");
        if (anchor instanceof HTMLAnchorElement) {
          const url = new URL(anchor.href);
          if (url.origin === location.origin && url.pathname === location.pathname) requestAnimationFrame(() => reveal(url.hash));
        }
      }
    };
    document.addEventListener("click", click);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("click", click);
    };
  }, [hash, ready]);
}
