import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntlProvider } from "react-intl";
import {
  FeeTokenQRCodeModal,
  QRCode,
  QRCodeModal,
} from "./QRCodeWithErrorBoundary";

const mockCanGenerateQRCode = vi.fn<(value: string) => boolean>();
const mockCanGenerateQRCodeAsync = vi.fn<(value: string) => Promise<boolean>>();
const mockQrSvg = vi.fn<(props: { value: string }) => React.ReactNode>();

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => mockQrSvg({ value }),
}));

vi.mock("@/utils/qrCodeUtils.ts", () => ({
  QR_CODE_MAX_LENGTH: 4296,
  canGenerateQRCode: (value: string) => mockCanGenerateQRCode(value),
  canGenerateQRCodeAsync: (value: string) => mockCanGenerateQRCodeAsync(value),
}));

vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerTitle: ({ children }: { children: React.ReactNode }) => (
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
  mockCanGenerateQRCode.mockReturnValue(true);
  mockCanGenerateQRCodeAsync.mockResolvedValue(true);
  mockQrSvg.mockImplementation(({ value }: { value: string }) => (
    <svg data-value={value} />
  ));

  if (root && container) {
    act(() => {
      root?.unmount();
    });
    container.remove();
    root = null;
    container = null;
  }
});

describe("QRCodeWithErrorBoundary", () => {
  it("shows too-large warning when QR cannot be generated", () => {
    mockCanGenerateQRCode.mockReturnValue(false);
    const page = renderWithIntl(<QRCode value={"x".repeat(5000)} />);
    expect(page.textContent).toContain("Data too large for QR code");
  });

  it("renders QRCode with label when generation is allowed", () => {
    const page = renderWithIntl(
      <QRCode
        value="hello-qr"
        label="Scan me"
      />,
    );
    expect(page.querySelector('svg[data-value="hello-qr"]')).not.toBeNull();
    expect(page.textContent).toContain("Scan me");
  });

  it("renders fallback when QR renderer throws", () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mockQrSvg.mockImplementation(() => {
      throw new Error("render error");
    });

    const page = renderWithIntl(<QRCode value="throw-case" />);
    expect(page.textContent).toContain("QR code cannot be generated");
    errorSpy.mockRestore();
  });

  it("returns null for modal when async capability check fails", async () => {
    mockCanGenerateQRCodeAsync.mockResolvedValue(false);
    const page = renderWithIntl(<QRCodeModal value="token-1" />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(page.textContent).toBe("");
  });

  it("renders modal trigger and fee-token wrapper labels", async () => {
    const page = renderWithIntl(
      <FeeTokenQRCodeModal feeToken="fee-token-abc" />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    const triggerButton = page.querySelector(
      'button[aria-label="Show QR code for fee token"]',
    );
    expect(triggerButton).not.toBeNull();
    expect(page.textContent).toContain("Fee Token QR Code");
  });
});
