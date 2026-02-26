import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"
import { useIntl } from "react-intl"

interface CopyButtonProps {
  value: string
  label?: string
  variant?: "ghost" | "outline" | "default"
  size?: "sm" | "default" | "lg" | "icon"
  className?: string
  showCheckmark?: boolean
}

export function CopyButton({
  value,
  label,
  variant = "ghost",
  size = "sm",
  className = "h-6 px-2",
  showCheckmark = false,
}: CopyButtonProps) {
  const intl = useIntl()
  const [copied, setCopied] = useState(false)
  const fallbackLabel = intl.formatMessage({
    id: "copyButton.defaultLabel",
    defaultMessage: "Value",
  })
  const labelValue = label ?? fallbackLabel

  const handleCopy = () => {
    navigator.clipboard
      .writeText(value)
      .then(() => {
        if (showCheckmark) {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }
        toast.success(
          intl.formatMessage(
            { id: "copyButton.copied", defaultMessage: "{label} copied to clipboard" },
            { label: labelValue },
          ),
        )
      })
      .catch(() => {
        toast.error(
          intl.formatMessage(
            { id: "copyButton.failed", defaultMessage: "Failed to copy {label}" },
            { label: labelValue },
          ),
        )
      })
  }

  return (
    <Button size={size} variant={variant} onClick={handleCopy} className={className}>
      {copied && showCheckmark ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </Button>
  )
}
