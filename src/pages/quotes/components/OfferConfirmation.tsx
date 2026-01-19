import { useState, useEffect } from "react"
import { ConfirmDrawer } from "@/components/Drawers.tsx"
import { CalendarModal, DatePickerButton } from "./CalendarModal.tsx"
import Big from "big.js"
import type { OfferFormResult } from "./OfferFormDrawer.tsx"
import { getDefaultDeadline } from "@/utils/dates"

interface OfferConfirmationProps {
  offerFormData?: OfferFormResult
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: OfferFormResult) => void
  maturityDate?: string | null
}

export function OfferConfirmation({
  offerFormData,
  open,
  onOpenChange,
  onSubmit,
  maturityDate,
}: OfferConfirmationProps) {
  const [validUntilDate, setValidUntilDate] = useState<Date | undefined>(undefined)
  const [showValidUntilCalendar, setShowValidUntilCalendar] = useState(false)
  const [draftValidUntilDate, setDraftValidUntilDate] = useState<Date | undefined>(undefined)

  useEffect(() => {
    if (!validUntilDate) {
      setValidUntilDate(getDefaultDeadline(maturityDate))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveDiscount = offerFormData
    ? new Big(1).minus(offerFormData.discount.net.value.div(offerFormData.discount.gross.value))
    : undefined

  return (
    <>
      <ConfirmDrawer
        title="Confirm offering quote"
        description="Review your inputs and confirm the offer"
        open={open}
        onOpenChange={(isOpen) => {
          onOpenChange(isOpen)
          if (isOpen) {
            setValidUntilDate(getDefaultDeadline(maturityDate))
          }
        }}
        onSubmit={() => {
          if (!offerFormData) {
            return
          }

          const finalOfferData = validUntilDate
            ? { ...offerFormData, ttl: { ttl: validUntilDate } }
            : offerFormData

          onSubmit(finalOfferData)
        }}
      >
        <div className="flex flex-col gap-4 px-4 py-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold w-48">Effective discount (relative):</span>
            <span className="text-sm text-right">{effectiveDiscount?.mul(new Big("100")).toFixed(2)}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold w-48">Effective discount (absolute):</span>
            <span className="text-sm text-right">
              {offerFormData?.discount.gross.value.minus(offerFormData?.discount.net.value).toFixed(0)}{" "}
              {offerFormData?.discount.net.currency}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold w-48">Net amount:</span>
            <span className="text-sm text-right">
              {offerFormData?.discount.net.value.round(0).toFixed(0)} {offerFormData?.discount.net.currency}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold w-32">Valid until:</span>
            <DatePickerButton
              date={validUntilDate ?? offerFormData?.ttl.ttl}
              onClick={() => {
                setDraftValidUntilDate(validUntilDate ?? offerFormData?.ttl.ttl)
                onOpenChange(false)
                setShowValidUntilCalendar(true)
              }}
            />
          </div>
        </div>
      </ConfirmDrawer>

      <CalendarModal
        isOpen={showValidUntilCalendar}
        selectedDate={validUntilDate}
        draftDate={draftValidUntilDate}
        title="Selected date"
        onClose={() => {
          setShowValidUntilCalendar(false)
          onOpenChange(true)
        }}
        onDateChange={setDraftValidUntilDate}
        onConfirm={() => {
          if (draftValidUntilDate) {
            setValidUntilDate(draftValidUntilDate)
          }
          setShowValidUntilCalendar(false)
          onOpenChange(true)
        }}
        onCancel={() => {
          setShowValidUntilCalendar(false)
          setDraftValidUntilDate(undefined)
          onOpenChange(true)
        }}
      />
    </>
  )
}

