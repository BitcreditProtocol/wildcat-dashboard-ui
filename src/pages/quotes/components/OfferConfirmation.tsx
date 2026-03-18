import { useEffect, useMemo, useState } from "react";
import { ConfirmDrawer } from "@/components/Drawers.tsx";
import { CalendarModal, DatePickerButton } from "./CalendarModal.tsx";
import Big from "big.js";
import type { OfferFormResult } from "./OfferFormDrawer.tsx";
import { addDays, addYears } from "date-fns";
import { getItem, removeItem, setItem } from "@/utils/local-storage";
import { useIntl } from "react-intl";
import { toUtcEndOfDay } from "@/utils/dates";

interface OfferConfirmationProps {
  offerFormData?: OfferFormResult;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: OfferFormResult) => void;
  quoteId?: string;
}

const OFFER_VALID_UNTIL_STORAGE_KEY_PREFIX = "offer-valid-until-";

export function OfferConfirmation({
  offerFormData,
  open,
  onOpenChange,
  onSubmit,
  quoteId,
}: OfferConfirmationProps) {
  const intl = useIntl();
  const [validUntilDate, setValidUntilDate] = useState<Date | undefined>(
    undefined,
  );
  const [showValidUntilCalendar, setShowValidUntilCalendar] = useState(false);
  const [draftValidUntilDate, setDraftValidUntilDate] = useState<
    Date | undefined
  >(undefined);
  const minDate = useMemo(() => {
    const date = addDays(new Date(), 1);
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);
  const maxDate = useMemo(() => {
    const date = addYears(new Date(), 1);
    date.setHours(23, 59, 59, 999);
    return date;
  }, []);
  const storageKey = quoteId
    ? `${OFFER_VALID_UNTIL_STORAGE_KEY_PREFIX}${quoteId}`
    : null;

  useEffect(() => {
    if (!open || validUntilDate || !storageKey) {
      return;
    }
    const stored = getItem<string>(storageKey);
    if (!stored) {
      return;
    }
    const parsed = new Date(stored);
    if (
      !Number.isNaN(parsed.getTime()) &&
      parsed >= minDate &&
      parsed <= maxDate
    ) {
      setValidUntilDate(parsed);
    } else {
      removeItem(storageKey);
    }
  }, [open, validUntilDate, storageKey, minDate, maxDate]);

  const effectiveDiscount = offerFormData
    ? new Big(1).minus(
        offerFormData.discount.net.value.div(
          offerFormData.discount.gross.value,
        ),
      )
    : undefined;

  return (
    <>
      <ConfirmDrawer
        title={intl.formatMessage({
          id: "quotes.offer.confirmTitle",
          defaultMessage: "Confirm offering quote",
        })}
        description={intl.formatMessage({
          id: "quotes.offer.confirmDescription",
          defaultMessage: "Review your inputs and confirm the offer",
        })}
        open={open}
        onOpenChange={(isOpen) => {
          onOpenChange(isOpen);
        }}
        submitButtonDisabled={!validUntilDate}
        onSubmit={() => {
          if (!offerFormData || !validUntilDate) {
            return;
          }

          const finalOfferData = {
            ...offerFormData,
            ttl: { ttl: toUtcEndOfDay(validUntilDate) },
          };

          onSubmit(finalOfferData);
        }}
      >
        <div className="flex flex-col gap-4 px-4 py-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold w-48">
              {intl.formatMessage({
                id: "quotes.detail.discount.relative",
                defaultMessage: "Effective fee (relative):",
              })}
            </span>
            <span className="text-sm text-right">
              {effectiveDiscount?.mul(new Big("100")).toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold w-48">
              {intl.formatMessage({
                id: "quotes.detail.discount.absolute",
                defaultMessage: "Effective fee (absolute):",
              })}
            </span>
            <span className="text-sm text-right">
              {offerFormData?.discount.gross.value
                .minus(offerFormData?.discount.net.value)
                .toFixed(0)}{" "}
              {offerFormData?.discount.net.currency}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold w-48">
              {intl.formatMessage({
                id: "quotes.offer.netAmount",
                defaultMessage: "Net amount:",
              })}
            </span>
            <span className="text-sm text-right">
              {offerFormData?.discount.net.value.round(0).toFixed(0)}{" "}
              {offerFormData?.discount.net.currency}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold w-32">
              {intl.formatMessage({
                id: "quotes.offer.validUntil",
                defaultMessage: "Valid until:",
              })}
            </span>
            <DatePickerButton
              date={validUntilDate}
              onClick={() => {
                setDraftValidUntilDate(validUntilDate);
                onOpenChange(false);
                setShowValidUntilCalendar(true);
              }}
            />
          </div>
        </div>
      </ConfirmDrawer>

      <CalendarModal
        isOpen={showValidUntilCalendar}
        selectedDate={validUntilDate}
        draftDate={draftValidUntilDate}
        title={intl.formatMessage({
          id: "quotes.calendar.selectedDate",
          defaultMessage: "Selected date",
        })}
        minDate={minDate}
        maxDate={maxDate}
        onClose={() => {
          setShowValidUntilCalendar(false);
          onOpenChange(true);
        }}
        onDateChange={setDraftValidUntilDate}
        onConfirm={() => {
          if (draftValidUntilDate) {
            const utcValidUntilDate = toUtcEndOfDay(draftValidUntilDate);
            setValidUntilDate(utcValidUntilDate);
            if (storageKey) {
              setItem(storageKey, utcValidUntilDate.toISOString());
            }
          }
          setShowValidUntilCalendar(false);
          onOpenChange(true);
        }}
        onCancel={() => {
          setShowValidUntilCalendar(false);
          setDraftValidUntilDate(undefined);
          onOpenChange(true);
        }}
      />
    </>
  );
}
