import { ConfirmDrawer } from "@/components/Drawers"
import type { ReactNode } from "react"
import { useIntl } from "react-intl"

interface DenyConfirmDrawerProps {
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: () => void
  children: ReactNode
}

export function DenyConfirmDrawer({ title, open, onOpenChange, onSubmit, children }: DenyConfirmDrawerProps) {
  const intl = useIntl()
  return (
    <ConfirmDrawer
      title={title}
      description={intl.formatMessage({
        id: "quotes.deny.description",
        defaultMessage: "Are you sure you want to deny this quote? This action cannot be undone.",
      })}
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      submitButtonText={intl.formatMessage({
        id: "quotes.deny.confirmButton",
        defaultMessage: "Yes, deny quote",
      })}
      submitButtonVariant="destructive"
      trigger={children}
    />
  )
}
