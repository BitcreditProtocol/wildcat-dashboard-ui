import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"

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
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard
      .writeText(value)
      .then(() => {
        if (showCheckmark) {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }
        toast.success(`${label ?? "Value"} copied to clipboard`)
      })
      .catch(() => {
        toast.error(`Failed to copy ${label ?? "value"}`)
      })
  }

  return (
    <Button size={size} variant={variant} onClick={handleCopy} className={className}>
      {copied && showCheckmark ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </Button>
  )
}
