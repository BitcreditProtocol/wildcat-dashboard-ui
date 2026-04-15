import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntlProvider } from "react-intl";
import { TruncatedTextPopover } from "./TruncatedTextPopover";
import { getTruncatedTextState } from "./truncated-text";

const toastSuccess = vi.fn<(msg: string) => void>();
const toastError = vi.fn<(msg: string) => void>();

vi.mock("sonner", () => ({
  toast: {
    success: (msg: string) => toastSuccess(msg),
    error: (msg: string) => toastError(msg),
  },
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverAnchor: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function renderIntoDom(element: ReactElement): HTMLDivElement {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const mountRoot = createRoot(mount);
  act(() => {
    mountRoot.render(element);
  });
  root = mountRoot;
  container = mount;
  return mount;
}

function renderWithIntl(element: ReactElement): HTMLDivElement {
  return renderIntoDom(<IntlProvider locale="en">{element}</IntlProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  Object.defineProperty(document.documentElement, "clientWidth", {
    configurable: true,
    value: 1200,
  });
  Object.defineProperty(window.navigator, "maxTouchPoints", {
    configurable: true,
    value: 0,
  });
  window.matchMedia = vi
    .fn()
    .mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;

  if (root && container) {
    act(() => {
      root?.unmount();
    });
    container.remove();
    root = null;
    container = null;
  }
});

describe("TruncatedTextPopover", () => {
  it("truncates likely node ids from the middle", () => {
    const state = getTruncatedTextState(
      "bitcrx1234567890abcdef1234567890",
      12,
    );

    expect(state.visibleLines[0]).toBe("bitcrx…67890");
    expect(state.hasComputedTruncation).toBe(true);
  });

  it("skips truncation entirely when maxLength is Infinity", () => {
    const nodeId = "bitcrx1234567890abcdef1234567890";
    const state = getTruncatedTextState(nodeId, Infinity);

    expect(state.visibleLines[0]).toBe(nodeId);
    expect(state.hasComputedTruncation).toBe(false);
    expect(state.hasLengthFallbackOverflow).toBe(false);
    expect(state.shouldShowPopover).toBe(false);
  });

  it("renders plain text when no truncation is needed", () => {
    const page = renderWithIntl(
      <TruncatedTextPopover
        text="short text"
        maxLength={50}
      />,
    );
    expect(page.textContent).toContain("short text");
    expect(page.querySelector("button")).toBeNull();
  });

  it("renders truncated trigger and full content for long text", () => {
    Object.defineProperty(document.documentElement, "clientWidth", {
      configurable: true,
      value: 320,
    });
    const longText = "abcdefghijklmno";
    const page = renderWithIntl(
      <TruncatedTextPopover
        text={longText}
        maxLength={10}
      />,
    );
    expect(page.textContent).toContain("abcdefghijk…");
    expect(page.textContent).toContain("…");
    expect(page.textContent).toContain(longText);
  });

  it("copies text and shows success toast", async () => {
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    const page = renderWithIntl(
      <TruncatedTextPopover
        text="copy me"
        showCopyButton
        maxLength={4}
      />,
    );
    const button = page.querySelector('button[title="Copy to clipboard"]');
    expect(button).not.toBeNull();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(toastSuccess).toHaveBeenCalled();
    act(() => {
      vi.runAllTimers();
    });
  });

  it("shows error toast when copy fails", async () => {
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("copy failed")),
      },
    });

    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const page = renderWithIntl(
      <TruncatedTextPopover
        text="copy me"
        showCopyButton
        maxLength={4}
      />,
    );
    const button = page.querySelector('button[title="Copy to clipboard"]');

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(toastError).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
