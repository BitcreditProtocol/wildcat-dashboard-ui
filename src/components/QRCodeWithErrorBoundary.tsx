import { Component, ReactNode, ErrorInfo, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AlertTriangle, QrCode } from "lucide-react";
import {
  AppIcon,
  Button,
  CopyToClipboardButton,
  DEFAULT_DYNAMIC_QR_CHUNK_SIZE,
  DEFAULT_DYNAMIC_QR_INTERVAL_MS,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DynamicQrProgress,
  createDynamicQrFrameLoop,
  shouldUseDynamicQr,
  splitIntoDynamicQrFrames,
} from "@bitcredit/ui-library";
import { canGenerateQRCode, canGenerateQRCodeAsync, QR_CODE_MAX_LENGTH } from "@/utils/qrCodeUtils";
import { useIntl } from "react-intl";

/**
 * Generic QR Code Components
 *
 * Usage:
 *
 * 1. Inline QR Code:
 *    <QRCode value="data to encode" size={200} label="Scan me" />
 *
 * 2. QR Code in Modal:
 *    <QRCodeModal
 *      value="data to encode"
 *      title="My QR Code"
 *      label="Scan to access"
 *    />
 *
 * 3. Fee Token QR Code (convenience wrapper):
 *    <FeeTokenQRCodeModal feeToken={token} />
 */

interface QRCodeErrorBoundaryProps {
  children: ReactNode;
  fallbackMessage: string;
}

interface QRCodeErrorBoundaryState {
  hasError: boolean;
}

class QRCodeErrorBoundary extends Component<QRCodeErrorBoundaryProps, QRCodeErrorBoundaryState> {
  constructor(props: QRCodeErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): QRCodeErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("QR Code Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          <AppIcon icon={AlertTriangle} size="sm" className="flex-shrink-0" />
          <span>{this.props.fallbackMessage}</span>
        </div>
      );
    }

    return this.props.children;
  }
}

interface QRCodeProps {
  value: string;
  size?: number;
  label?: string;
  className?: string;
}

interface QRCodeModalProps extends QRCodeProps {
  title?: string;
  triggerLabel?: string;
}

export function QRCode({ value, size = 200, label, className }: QRCodeProps) {
  const intl = useIntl();
  const errorFallback = intl.formatMessage({
    id: "qrCode.error.generic",
    defaultMessage: "QR code cannot be generated (data too large)",
  });

  if (!canGenerateQRCode(value)) {
    return (
      <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
        <AppIcon icon={AlertTriangle} size="sm" className="flex-shrink-0" />
        <span>
          {intl.formatMessage(
            {
              id: "qrCode.error.tooLarge",
              defaultMessage: "Data too large for QR code ({length} characters, max {max})",
            },
            { length: value.length, max: QR_CODE_MAX_LENGTH }
          )}
        </span>
      </div>
    );
  }

  return (
    <QRCodeErrorBoundary fallbackMessage={errorFallback}>
      <div className={`flex flex-col gap-2 p-4 bg-white border rounded-lg ${className ?? ""}`}>
        <QRCodeSVG value={value} size={size} level="M" />
        {label && <span className="text-xs text-muted-foreground text-center">{label}</span>}
      </div>
    </QRCodeErrorBoundary>
  );
}

export function QRCodeModal({ value, size = 768, label, title, triggerLabel }: QRCodeModalProps) {
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const [canRender, setCanRender] = useState(false);
  const resolvedTitle = title ?? intl.formatMessage({ id: "qrCode.modal.title", defaultMessage: "QR Code" });
  const resolvedTriggerLabel =
    triggerLabel ??
    intl.formatMessage({
      id: "qrCode.modal.triggerLabel",
      defaultMessage: "Show QR code",
    });
  const errorFallback = intl.formatMessage({
    id: "qrCode.error.generic",
    defaultMessage: "QR code cannot be generated (data too large)",
  });

  useEffect(() => {
    let isActive = true;

    void (async () => {
      const result = await canGenerateQRCodeAsync(value);
      if (isActive) {
        setCanRender(result);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [value]);

  if (!canGenerateQRCode(value) || !canRender) {
    return null;
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" aria-label={resolvedTriggerLabel}>
          <AppIcon icon={QrCode} size="sm" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>{resolvedTitle}</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col items-center gap-4 p-0 sm:p-6">
          <QRCodeErrorBoundary fallbackMessage={errorFallback}>
            <div className="flex flex-col gap-2 p-4 bg-white border rounded-lg w-full max-w-[90vw] sm:max-w-md">
              <QRCodeSVG value={value} size={size} level="M" className="w-full h-auto" />
              {label && <span className="text-xs text-muted-foreground text-center">{label}</span>}
            </div>
          </QRCodeErrorBoundary>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function FeeTokenQRCodeModal({ feeToken, size = 512 }: { feeToken: string; size?: number }) {
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const useDynamicQr = shouldUseDynamicQr(feeToken, DEFAULT_DYNAMIC_QR_CHUNK_SIZE);
  const frames = useMemo(
    () => (useDynamicQr ? splitIntoDynamicQrFrames(feeToken, { chunkSize: DEFAULT_DYNAMIC_QR_CHUNK_SIZE }) : [feeToken]),
    [feeToken, useDynamicQr]
  );
  const [currentFrame, setCurrentFrame] = useState(frames[0] ?? feeToken);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const resolvedTitle = intl.formatMessage({
    id: "qrCode.feeToken.title",
    defaultMessage: "Fee Token QR Code",
  });
  const resolvedTriggerLabel = intl.formatMessage({
    id: "qrCode.feeToken.triggerLabel",
    defaultMessage: "Show QR code for fee token",
  });
  const resolvedLabel = intl.formatMessage({
    id: "qrCode.feeToken.label",
    defaultMessage: "Scan to use fee token",
  });
  const copyLabel = intl
    .formatMessage({
      id: "quotes.detail.feeToken",
      defaultMessage: "Fee token:",
    })
    .replace(/:$/, "");

  useEffect(() => {
    setCurrentFrame(frames[0] ?? feeToken);
    setCurrentFrameIndex(0);

    if (!open || !useDynamicQr || frames.length <= 1) {
      return;
    }

    const controller = createDynamicQrFrameLoop(
      frames,
      (frame, index) => {
        setCurrentFrame(frame);
        setCurrentFrameIndex(index);
      },
      { intervalMs: DEFAULT_DYNAMIC_QR_INTERVAL_MS }
    );

    return () => {
      controller.stop();
    };
  }, [feeToken, frames, open, useDynamicQr]);

  return (
    <QRCodeErrorBoundary
      fallbackMessage={intl.formatMessage({
        id: "qrCode.error.generic",
        defaultMessage: "QR code cannot be generated (data too large)",
      })}
    >
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" aria-label={resolvedTriggerLabel}>
            <AppIcon icon={QrCode} size="sm" />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="max-w-full max-w-sm-[430px] max-h-none rounded-none border-0 bg-elevation-50 px-6 pb-8 text-text-300 dark:bg-elevation-50 [&>div:first-child]:hidden">
          <DrawerHeader className="px-0 pb-5 pt-20 text-center sm:text-center">
            <DrawerTitle className="text-xl font-semibold text-text-300">{resolvedTitle}</DrawerTitle>
            <DrawerDescription className="text-sm text-text-200">{resolvedLabel}</DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col items-center gap-4 px-0">
            <div className="w-full max-w-[330px] rounded-2xl border border-divider-200 bg-elevation-200 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
              <QRCodeSVG
                value={currentFrame}
                size={size}
                level="M"
                bgColor="var(--color-elevation-200)"
                fgColor="var(--color-text-300)"
                className="h-auto w-full"
              />
            </div>
            {useDynamicQr && frames.length > 1 && (
              <DynamicQrProgress currentFrameIndex={currentFrameIndex} totalFrames={frames.length} className="w-full max-w-[296px]" />
            )}
            <div className="flex w-full max-w-[260px] items-center justify-center gap-2 text-text-200">
              <span className="min-w-0 truncate font-mono text-xs">{feeToken}</span>
              <CopyToClipboardButton
                value={feeToken}
                label={copyLabel}
                variant="ghost"
                size="xxs"
                className="shrink-0 !bg-transparent !p-0 text-text-200 hover:text-text-300"
              />
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </QRCodeErrorBoundary>
  );
}
