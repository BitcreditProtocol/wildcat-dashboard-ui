import { useState } from "react"
import { Button } from "@/components/ui/button.tsx"
import { ConfirmDrawer } from "@/components/Drawers.tsx"
import { LoaderIcon } from "lucide-react"
import { CalendarModal, DatePickerButton } from "./CalendarModal.tsx"

interface RequestToPayConfirmationProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (deadline: Date) => void
  isFetching: boolean
  isPending: boolean
}

export function RequestToPayConfirmation({
  open,
  onOpenChange,
  onSubmit,
  isFetching,
  isPending,
}: RequestToPayConfirmationProps) {
  const [validUntilDate, setValidUntilDate] = useState<Date | undefined>(undefined)
  const [showPaymentCalendar, setShowPaymentCalendar] = useState(false)
  const [draftValidUntilDate, setDraftValidUntilDate] = useState<Date | undefined>(undefined)
  const addDays = 30 * 24 * 60 * 60 * 1000

  return (
    <>
      <ConfirmDrawer
        title="Confirm requesting to pay"
        description="Are you sure you want to request to pay this e-bill?"
        open={open}
        onOpenChange={(isOpen) => {
          onOpenChange(isOpen)
          if (isOpen) {
            setValidUntilDate(new Date(Date.now() + addDays))
          }
        }}
        onSubmit={() => {
          const deadline = validUntilDate ?? new Date(Date.now() + addDays)
          onSubmit(deadline)
        }}
        submitButtonText="Yes, request to pay"
        trigger={
          <Button className="flex-1 max-w-sm" disabled={isFetching || isPending} variant="default">
            Request to Pay {isPending && <LoaderIcon className="stroke-1 animate-spin" />}
          </Button>
        }
      >
        <div className="flex flex-col gap-4 px-4 py-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Payment deadline:</span>
            <DatePickerButton
              date={validUntilDate}
              onClick={() => {
                setDraftValidUntilDate(validUntilDate)
                onOpenChange(false)
                setShowPaymentCalendar(true)
              }}
            />
          </div>
        </div>
      </ConfirmDrawer>

      <CalendarModal
        isOpen={showPaymentCalendar}
        selectedDate={validUntilDate}
        draftDate={draftValidUntilDate}
        title="Payment deadline"
        onClose={() => {
          setShowPaymentCalendar(false)
          onOpenChange(true)
        }}
        onDateChange={setDraftValidUntilDate}
        onConfirm={() => {
          if (draftValidUntilDate) {
            setValidUntilDate(draftValidUntilDate)
          }
          setShowPaymentCalendar(false)
          onOpenChange(true)
        }}
        onCancel={() => {
          setShowPaymentCalendar(false)
          setDraftValidUntilDate(undefined)
          onOpenChange(true)
        }}
      />
    </>
  )
}
