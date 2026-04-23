import { useEffect, useMemo, useState } from "react";
import { AppIcon, Button, Text } from "@bitcredit/ui-library";
import { ConfirmDrawer } from "@/components/Drawers";
import { AlertCircleIcon, LoaderIcon } from "lucide-react";
import { CalendarModal, DatePickerButton } from "./CalendarModal";
import { useQuery } from "@tanstack/react-query";
import { getEbillOptions } from "@/generated/client/@tanstack/react-query.gen";
import { useIntl } from "react-intl";
import { getItem, setItem } from "@/utils/local-storage";

interface RequestToPayConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (deadline: Date) => void;
  isFetching: boolean;
  isPending: boolean;
  maturityDate?: string | null;
  billId: string;
}

const REQUEST_TO_PAY_DEADLINE_STORAGE_KEY = "requestToPayDeadlineUtc";
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

const getMinSelectableDate = (maturityDate?: string | null): Date => {
  const now = new Date();
  const maturity = maturityDate ? new Date(maturityDate) : null;
  const baseDate = maturity && maturity > now ? maturity : now;
  return new Date(baseDate.getTime() + TWO_DAYS_MS);
};

const toUtcEndOfDay = (date: Date): Date => {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
};

export function RequestToPayConfirmation({
  open,
  onOpenChange,
  onSubmit,
  isFetching,
  isPending,
  maturityDate,
  billId,
}: RequestToPayConfirmationProps) {
  const intl = useIntl();
  const [validUntilDate, setValidUntilDate] = useState<Date | undefined>(undefined);
  const [showPaymentCalendar, setShowPaymentCalendar] = useState(false);
  const [draftValidUntilDate, setDraftValidUntilDate] = useState<Date | undefined>(undefined);
  const minSelectableDate = useMemo(() => getMinSelectableDate(maturityDate), [maturityDate]);

  const ebillQuery = useQuery({
    ...getEbillOptions({ path: { bid: billId } }),
    enabled: true,
    retry: 0,
    refetchInterval: (query) => {
      return query.state.data ? false : 2000;
    },
    refetchIntervalInBackground: true,
  });

  const ebillAvailable = !ebillQuery.isLoading && !ebillQuery.error && !!ebillQuery.data;

  useEffect(() => {
    if (!open || validUntilDate) {
      return;
    }

    const stored = getItem<string>(REQUEST_TO_PAY_DEADLINE_STORAGE_KEY);
    const fallbackDeadline = toUtcEndOfDay(minSelectableDate);
    if (stored) {
      const parsed = new Date(stored);
      if (!Number.isNaN(parsed.getTime()) && parsed >= minSelectableDate) {
        setValidUntilDate(parsed);
        setDraftValidUntilDate(parsed);
        return;
      }
    }

    setValidUntilDate(fallbackDeadline);
    setDraftValidUntilDate(fallbackDeadline);
    setItem(REQUEST_TO_PAY_DEADLINE_STORAGE_KEY, fallbackDeadline.toISOString());
  }, [open, validUntilDate, minSelectableDate]);

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
          onOpenChange(isOpen);
        }}
        onSubmit={() => {
          if (validUntilDate) {
            onSubmit(validUntilDate);
          }
        }}
        submitButtonText={intl.formatMessage({
          id: "quotes.requestToPay.confirmButton",
          defaultMessage: "Yes, request to pay",
        })}
        submitButtonDisabled={!validUntilDate}
        trigger={
          <div className="flex flex-col items-start gap-1 flex-1 max-w-sm">
            <Button
              className="w-full"
              disabled={isFetching || isPending || !ebillAvailable}
              variant="default"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenChange(true);
              }}
            >
              {ebillQuery.isError ? (
                <span className="flex items-center gap-2">
                  <AppIcon icon={AlertCircleIcon} weight="thin" />
                  {intl.formatMessage({
                    id: "quotes.requestToPay.errorInfo",
                    defaultMessage: "Failed to load payment info",
                  })}
                </span>
              ) : !ebillAvailable ? (
                <span className="flex items-center gap-2">
                  <AppIcon icon={LoaderIcon} weight="thin" className="animate-spin" />
                  {intl.formatMessage({
                    id: "quotes.requestToPay.loadingInfo",
                    defaultMessage: "Loading information for payment",
                  })}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {intl.formatMessage({
                    id: "quotes.requestToPay.button",
                    defaultMessage: "Request to pay",
                  })}{" "}
                  {isPending && <AppIcon icon={LoaderIcon} weight="thin" className="animate-spin" />}
                </span>
              )}
            </Button>
            {ebillQuery.isError && (
              <button
                type="button"
                className="text-xs text-muted-foreground underline self-start"
                onClick={() => {
                  void ebillQuery.refetch();
                }}
              >
                {intl.formatMessage({
                  id: "quotes.requestToPay.retry",
                  defaultMessage: "Retry",
                })}
              </button>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-4 px-4 py-4">
          <div className="flex flex-col gap-2">
            <Text variant="label">
              {intl.formatMessage({
                id: "quotes.requestToPay.deadlineLabel",
                defaultMessage: "Payment deadline:",
              })}
            </Text>
            <DatePickerButton
              onClick={() => {
                setDraftValidUntilDate(validUntilDate);
                onOpenChange(false);
                setShowPaymentCalendar(true);
              }}
            />
          </div>
        </div>
      </ConfirmDrawer>

      <CalendarModal
        isOpen={showPaymentCalendar}
        selectedDate={validUntilDate}
        draftDate={draftValidUntilDate}
        title={intl.formatMessage({
          id: "quotes.requestToPay.deadlineTitle",
          defaultMessage: "Payment deadline",
        })}
        minDate={minSelectableDate}
        onClose={() => {
          setShowPaymentCalendar(false);
          onOpenChange(true);
        }}
        onDateChange={setDraftValidUntilDate}
        onConfirm={() => {
          if (draftValidUntilDate) {
            const utcDeadline = toUtcEndOfDay(draftValidUntilDate);
            setValidUntilDate(utcDeadline);
            setItem(REQUEST_TO_PAY_DEADLINE_STORAGE_KEY, utcDeadline.toISOString());
          }
          setShowPaymentCalendar(false);
          onOpenChange(true);
        }}
        onCancel={() => {
          setShowPaymentCalendar(false);
          setDraftValidUntilDate(undefined);
          onOpenChange(true);
        }}
      />
    </>
  );
}
