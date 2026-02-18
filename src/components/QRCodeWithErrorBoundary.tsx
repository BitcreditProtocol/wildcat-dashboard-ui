import { Component, ReactNode, ErrorInfo, useEffect, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { AlertTriangle, QrCode } from "lucide-react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { canGenerateQRCode, canGenerateQRCodeAsync, QR_CODE_MAX_LENGTH } from "@/utils/qrCodeUtils.ts"
import { useIntl } from "react-intl"

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
  children: ReactNode
  fallbackMessage: string
}

interface QRCodeErrorBoundaryState {
  hasError: boolean
}

class QRCodeErrorBoundary extends Component<QRCodeErrorBoundaryProps, QRCodeErrorBoundaryState> {
  constructor(props: QRCodeErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): QRCodeErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("QR Code Error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{this.props.fallbackMessage}</span>
        </div>
      )
    }

    return this.props.children
  }
}

interface QRCodeProps {
  value: string
  size?: number
  label?: string
  className?: string
}

interface QRCodeModalProps extends QRCodeProps {
  title?: string
  triggerLabel?: string
}

export function QRCode({ value, size = 200, label, className }: QRCodeProps) {
  const intl = useIntl()
  const errorFallback = intl.formatMessage({
    id: "qrCode.error.generic",
    defaultMessage: "QR code cannot be generated (data too large)",
  })

  if (!canGenerateQRCode(value)) {
    return (
      <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span>
          {intl.formatMessage(
            {
              id: "qrCode.error.tooLarge",
              defaultMessage: "Data too large for QR code ({length} characters, max {max})",
            },
            { length: value.length, max: QR_CODE_MAX_LENGTH },
          )}
        </span>
      </div>
    )
  }

  return (
    <QRCodeErrorBoundary fallbackMessage={errorFallback}>
      <div className={`flex flex-col gap-2 p-4 bg-white border rounded-lg ${className ?? ""}`}>
        <QRCodeSVG value={value} size={size} level="M" />
        {label && <span className="text-xs text-muted-foreground text-center">{label}</span>}
      </div>
    </QRCodeErrorBoundary>
  )
}

export function QRCodeModal({ value, size = 768, label, title, triggerLabel }: QRCodeModalProps) {
  const intl = useIntl()
  const [open, setOpen] = useState(false)
  const [canRender, setCanRender] = useState(false)
  const resolvedTitle = title ?? intl.formatMessage({ id: "qrCode.modal.title", defaultMessage: "QR Code" })
  const resolvedTriggerLabel =
    triggerLabel ?? intl.formatMessage({ id: "qrCode.modal.triggerLabel", defaultMessage: "Show QR code" })
  const errorFallback = intl.formatMessage({
    id: "qrCode.error.generic",
    defaultMessage: "QR code cannot be generated (data too large)",
  })

  useEffect(() => {
    let isActive = true

    void (async () => {
      const result = await canGenerateQRCodeAsync(value)
      if (isActive) {
        setCanRender(result)
      }
    })()

    return () => {
      isActive = false
    }
  }, [value])

  if (!canGenerateQRCode(value) || !canRender) {
    return null
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={resolvedTriggerLabel}>
          <QrCode className="h-4 w-4" />
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
  )
}

export function FeeTokenQRCodeModal({ feeToken, size = 512 }: { feeToken: string; size?: number }) {
  const intl = useIntl()

  return (
    <QRCodeErrorBoundary
      fallbackMessage={intl.formatMessage({
        id: "qrCode.error.generic",
        defaultMessage: "QR code cannot be generated (data too large)",
      })}
    >
      <QRCodeModal
        value={feeToken}
        size={size}
        label={intl.formatMessage({
          id: "qrCode.feeToken.label",
          defaultMessage: "Scan to use fee token",
        })}
        title={intl.formatMessage({
          id: "qrCode.feeToken.title",
          defaultMessage: "Fee Token QR Code",
        })}
        triggerLabel={intl.formatMessage({
          id: "qrCode.feeToken.triggerLabel",
          defaultMessage: "Show QR code for fee token",
        })}
      />
    </QRCodeErrorBoundary>
  )
}
