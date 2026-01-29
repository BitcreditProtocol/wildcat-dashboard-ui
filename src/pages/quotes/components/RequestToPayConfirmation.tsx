import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button.tsx"
import { ConfirmDrawer } from "@/components/Drawers.tsx"
import { LoaderIcon } from "lucide-react"
import { CalendarModal, DatePickerButton } from "./CalendarModal.tsx"
import { useQuery } from "@tanstack/react-query"
import { getEbillOptions } from "@/generated/client/@tanstack/react-query.gen"
<<<<<<< Updated upstream
import { getDefaultDeadline } from "@/utils/dates"
=======
import { addDays } from "date-fns"
import { getItem, setItem } from "@/utils/local-storage"
import { useIntl } from "react-intl"
>>>>>>> Stashed changes

interface RequestToPayConfirmationProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (deadline: Date) => void
  isFetching: boolean
  isPending: boolean
  maturityDate?: string | null
  billId: string
}

export function RequestToPayConfirmation({
  open,
  onOpenChange,
  onSubmit,
  isFetching,
  isPending,
  maturityDate,
  billId,
}: RequestToPayConfirmationProps) {
  const intl = useIntl()
  const [validUntilDate, setValidUntilDate] = useState<Date | undefined>(undefined)
  const [showPaymentCalendar, setShowPaymentCalendar] = useState(false)
  const [draftValidUntilDate, setDraftValidUntilDate] = useState<Date | undefined>(undefined)

  const ebillQuery = useQuery({
    ...getEbillOptions({ path: { bid: billId } }),
    enabled: true,
    retry: 0,
    refetchInterval: (query) => {
      return query.state.data ? false : 2000
    },
    refetchIntervalInBackground: true,
  })

  const ebillAvailable = !ebillQuery.isLoading && !ebillQuery.error && !!ebillQuery.data

  useEffect(() => {
    if (!validUntilDate) {
      setValidUntilDate(getDefaultDeadline(maturityDate))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <ConfirmDrawer
        title={intl.formatMessage({
          id: "quotes.requestToPay.confirmTitle",
          defaultMessage: "Confirm requesting to pay",
        })}
        description={intl.formatMessage({
          id: "quotes.requestToPay.confirmDescription",
          defaultMessage: "Are you sure you want to request to pay this e-bill?",
        })}
        open={open}
        onOpenChange={(isOpen) => {
          onOpenChange(isOpen)
          if (isOpen) {
            setValidUntilDate(getDefaultDeadline(maturityDate))
          }
        }}
        onSubmit={() => {
          const deadline = validUntilDate ?? getDefaultDeadline(maturityDate)
          onSubmit(deadline)
        }}
        submitButtonText={intl.formatMessage({
          id: "quotes.requestToPay.confirmButton",
          defaultMessage: "Yes, request to pay",
        })}
        submitButtonDisabled={!validUntilDate}
        trigger={
          <Button
            className="flex-1 max-w-sm"
            disabled={isFetching || isPending || !ebillAvailable}
            variant="default"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onOpenChange(true)
            }}
          >
            {!ebillAvailable ? (
              <span className="flex items-center gap-2">
                <LoaderIcon className="stroke-1 animate-spin" />
                {intl.formatMessage({
                  id: "quotes.requestToPay.loadingInfo",
                  defaultMessage: "Loading information for payment",
                })}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                {intl.formatMessage({
                  id: "quotes.requestToPay.button",
                  defaultMessage: "Request to pay"
                })}{" "}
                {isPending && <LoaderIcon className="stroke-1 animate-spin" />}
              </span>
            )}
          </Button>
        }
      >
        <div className="flex flex-col gap-4 px-4 py-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">
              {intl.formatMessage({
                id: "quotes.requestToPay.deadlineLabel",
                defaultMessage: "Payment deadline:",
              })}
            </span>
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
<<<<<<< Updated upstream
        title="Payment deadline"
=======
        title={intl.formatMessage({
          id: "quotes.requestToPay.deadlineTitle",
          defaultMessage: "Payment deadline",
        })}
        minDate={minSelectableDate}
>>>>>>> Stashed changes
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
