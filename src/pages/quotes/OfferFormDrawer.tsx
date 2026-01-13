import { useState } from "react"
import Big from "big.js"
import { BaseDrawer } from "@/components/Drawers"
import { Button } from "@/components/ui/button"
import { DrawerFooter, DrawerClose } from "@/components/ui/drawer"
import { GrossToNetDiscountForm } from "@/components/GrossToNetDiscountForm"
import type { InfoReply } from "@/generated/client/types.gen"
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
  const [formResult, setFormResult] = useState<OfferFormResult>()

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

    setFormResult(result)
  }

  const handleConfirm = () => {
    if (formResult) {
      onSubmit(formResult)
      setFormResult(undefined)
    }
  }

  const startDate = value.status === "Pending" ? new Date(value.submitted) : new Date()
  const endDate =
    value.status === "Pending" ? new Date(value.suggested_expiration) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  // bug remove next button (bug remove days to 3)
  // signature needed? - mykyta
  // request to pay / enable minting button disabled/remove after activating payment
  // enable minting should be
  return (
    <BaseDrawer title={title} description={description} open={open} onOpenChange={onOpenChange} trigger={children}>
      <div className="px-4">
        <GrossToNetDiscountForm
          startDate={startDate}
          endDate={endDate}
          gross={{
            value: new Big(value.bill.sum),
            currency: "sat",
          }}
          onSubmit={handleFormSubmit}
          submitButtonText="Next"
        />
      </div>
      <DrawerFooter>
        <div className="flex gap-2">
          <DrawerClose asChild>
            <Button className="flex-1" variant="outline" size="lg">
              Cancel
            </Button>
          </DrawerClose>
          <Button className="flex-1" size="lg" onClick={handleConfirm} disabled={!formResult}>
            Confirm
          </Button>
        </div>
      </DrawerFooter>
    </BaseDrawer>
  )
}
