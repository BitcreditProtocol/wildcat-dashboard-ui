import { ConfirmDrawer } from "@/components/Drawers.tsx"
import type { ReactNode } from "react"

interface DenyConfirmDrawerProps {
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: () => void
  children: ReactNode
}

export function DenyConfirmDrawer({ title, open, onOpenChange, onSubmit, children }: DenyConfirmDrawerProps) {
  return (
    <ConfirmDrawer
      title={title}
      description="Are you sure you want to deny this quote? This action cannot be undone."
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      submitButtonText="Yes, deny quote"
      submitButtonVariant="destructive"
      trigger={children}
    />
  )
}
