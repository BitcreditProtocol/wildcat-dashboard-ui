import { Component, ReactNode, ErrorInfo, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { AlertTriangle, QrCode } from "lucide-react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { canGenerateQRCode, QR_CODE_MAX_LENGTH } from "@/utils/qrCodeUtils.ts"

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
          <span>QR code cannot be generated (data too large)</span>
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
  if (value.length > QR_CODE_MAX_LENGTH) {
    return (
      <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span>Data too large for QR code ({value.length} characters, max {QR_CODE_MAX_LENGTH})</span>
      </div>
    )
  }

  return (
    <QRCodeErrorBoundary>
      <div className={`flex flex-col gap-2 p-4 bg-white border rounded-lg ${className ?? ""}`}>
        <QRCodeSVG
          value={value}
          size={size}
          level="M"
        />
        {label && (
          <span className="text-xs text-muted-foreground text-center">
            {label}
          </span>
        )}
      </div>
    </QRCodeErrorBoundary>
  )
}

export function QRCodeModal({
  value,
  size = 768,
  label,
  title = "QR Code",
  triggerLabel = "Show QR code"
}: QRCodeModalProps) {
  const [open, setOpen] = useState(false)

  if (!canGenerateQRCode(value)) {
    return null
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={triggerLabel}
        >
          <QrCode className="h-4 w-4" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col items-center gap-4 p-6">
          <QRCodeErrorBoundary>
            <div className="flex flex-col gap-2 p-4 bg-white border rounded-lg">
              <QRCodeSVG
                value={value}
                size={size}
                level="M"
              />
              {label && (
                <span className="text-xs text-muted-foreground text-center">
                  {label}
                </span>
              )}
            </div>
          </QRCodeErrorBoundary>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export function FeeTokenQRCodeModal({ feeToken, size = 768 }: { feeToken: string; size?: number }) {
  return (
    <QRCodeModal
      value={feeToken}
      size={size}
      label="Scan to use fee token"
      title="Fee Token QR Code"
      triggerLabel="Show QR code for fee token"
    />
  )
}
