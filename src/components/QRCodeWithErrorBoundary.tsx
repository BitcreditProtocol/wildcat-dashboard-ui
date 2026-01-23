import { Component, ReactNode, ErrorInfo, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { AlertTriangle, QrCode } from "lucide-react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"

interface QRCodeErrorBoundaryProps {
  children: ReactNode
}

interface QRCodeErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class QRCodeErrorBoundary extends Component<QRCodeErrorBoundaryProps, QRCodeErrorBoundaryState> {
  constructor(props: QRCodeErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): QRCodeErrorBoundaryState {
    return { hasError: true, error }
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

interface FeeTokenQRCodeProps {
  feeToken: string
  size?: number
}

const QR_CODE_MAX_LENGTH = 2956

export function canGenerateQRCode(text: string): boolean {
  return text.length <= QR_CODE_MAX_LENGTH
}

export function FeeTokenQRCode({ feeToken, size = 200 }: FeeTokenQRCodeProps) {
  if (feeToken.length > QR_CODE_MAX_LENGTH) {
    return (
      <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span>Fee token too large for QR code ({feeToken.length} characters, max {QR_CODE_MAX_LENGTH})</span>
      </div>
    )
  }

  return (
    <QRCodeErrorBoundary>
      <div className="flex flex-col gap-2 p-4 bg-white border rounded-lg">
        <QRCodeSVG
          value={feeToken}
          size={size}
          level="M"
        />
      </div>
    </QRCodeErrorBoundary>
  )
}

export function FeeTokenQRCodeModal({ feeToken, size = 768 }: FeeTokenQRCodeProps) {
  const [open, setOpen] = useState(false)

  if (!canGenerateQRCode) {
    return null
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Show QR code for fee token"
        >
          <QrCode className="h-4 w-4" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Fee Token QR Code</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col items-center gap-4 p-6">
          <QRCodeErrorBoundary>
            <div className="flex flex-col gap-2 p-4 bg-white border rounded-lg">
              <QRCodeSVG
                value={feeToken}
                size={size}
                level="M"
              />
              <span className="text-xs text-muted-foreground text-center">
                Scan to use fee token
              </span>
            </div>
          </QRCodeErrorBoundary>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
