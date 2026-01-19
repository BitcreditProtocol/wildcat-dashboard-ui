import Big from "big.js"
import { BaseDrawer } from "@/components/Drawers.tsx"
import { GrossToNetDiscountForm } from "@/components/GrossToNetDiscountForm.tsx"
import type { InfoReply } from "@/generated/client/types.gen.ts"
import type { ReactNode } from "react"

export interface OfferFormResult {
  discount: {
    days: number
    discountRate: Big
    net: {
      value: Big
      currency: string
    }
    gross: {
      value: Big
      currency: string
    }
  }
  ttl: {
    ttl: Date
  }
}

interface OfferFormDrawerProps {
  title: string
  description: string
  value: InfoReply
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: OfferFormResult) => void
  children: ReactNode
}

export function OfferFormDrawer({
  title,
  description,
  value,
  open,
  onOpenChange,
  onSubmit,
  children,
}: OfferFormDrawerProps) {
  const handleFormSubmit = (values: {
    days: number
    discountRate: Big
    net: { value: Big; currency: string }
    gross: { value: Big; currency: string }
  }) => {
    const now = new Date()
    const ttl = new Date(now.getTime() + values.days * 24 * 60 * 60 * 1000)

    const result: OfferFormResult = {
      discount: values,
      ttl: { ttl },
    }

    onSubmit(result)
  }

  const startDate = value.status === "Pending" ? new Date(value.submitted) : new Date()
  const addDays = 30 * 24 * 60 * 60 * 1000
  const endDate = value.status === "Pending" ? new Date(value.suggested_expiration) : new Date(Date.now() + addDays)

  return (
    <BaseDrawer title={title} description={description} open={open} onOpenChange={onOpenChange} trigger={children}>
      <GrossToNetDiscountForm
        startDate={startDate}
        endDate={endDate}
        gross={{
          value: new Big(value.bill.sum),
          currency: "sat",
        }}
        onSubmit={handleFormSubmit}
        quoteId={value.id}
      />
    </BaseDrawer>
  )
}
