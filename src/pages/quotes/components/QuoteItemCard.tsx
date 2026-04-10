import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getQuoteOptions } from "@/generated/client/@tanstack/react-query.gen";
import { useQuery } from "@tanstack/react-query";
import { LoaderIcon } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { truncateString, formatStatusLabel } from "@/utils/strings";
import { getQuoteStatusVariant } from "@/utils/quote-status";
import { formatNumber } from "@/utils/strings";
import type { LightInfo } from "@/generated/client/types.gen";
import { ParticipantsOverviewCard } from "@/components/ParticipantsOverview";
import { toast } from "sonner";
import * as React from "react";
import { HighlightText } from "@/components/ui/search";
import { useIntl } from "react-intl";
import { getApiErrorMessage } from "@/lib/api-error";

const RETRY_COUNT = 2;
const retryDelay = (attempt: number) => Math.min(1000 * 2 ** attempt, 10_000);

export function QuoteItemCard({
  quote,
  effectiveStatus,
  searchQuery,
}: {
  quote: LightInfo;
  effectiveStatus: string;
  searchQuery: string;
}) {
  const intl = useIntl();
  const navigate = useNavigate();

  const queryResult = useQuery({
    ...getQuoteOptions({
      path: { qid: quote.id },
    }),
    retry: RETRY_COUNT,
    retryDelay,
    enabled: !!quote.id,
  });

  const {
    data: quoteDetails,
    isLoading: isLoadingDetails,
    error: detailsError,
  } = queryResult;
  const bill = quoteDetails?.bill;

  const handleQuoteClick = (e: React.MouseEvent) => {
    if (detailsError) {
      e.preventDefault();
      const errorMessage = getApiErrorMessage(detailsError);
      toast.error(
        intl.formatMessage({
          id: "quotes.card.error.title",
          defaultMessage: "Cannot load quote",
        }),
        {
          description: intl.formatMessage(
            {
              id: "quotes.card.error.description",
              defaultMessage: "Quote {id} is unavailable. {message}",
            },
            {
              id: truncateString(quote.id, 12),
              message:
                errorMessage ||
                intl.formatMessage({
                  id: "quotes.error.tryAgain",
                  defaultMessage: "Please try again later.",
                }),
            },
          ),
          id: `quote-error-${quote.id}`,
          duration: 5000,
        },
      );
    } else {
      void navigate(`/quotes/${quote.id}`);
    }
  };

  return (
    <Card className="text-sm">
      <div className="flex justify-between items-center gap-4 px-4 pt-4">
        <CardTitle className="text-xl">
          <div className="items-center flex gap-1">
            <span className="font-mono pt-2">
              <Link
                to={`/quotes/${quote.id}`}
                onClick={handleQuoteClick}
              >
                <HighlightText
                  text={quote.id}
                  highlight={searchQuery}
                />
              </Link>
            </span>
            <span></span>
          </div>
        </CardTitle>
        <div className="flex gap-2">
          <div className="leading-none font-semibold tracking-tight text-3xl">
            <HighlightText
              text={`${formatNumber(intl.locale, quote.sum)} sat`}
              highlight={searchQuery}
            />
          </div>
          <Badge variant={getQuoteStatusVariant(effectiveStatus)}>
            <HighlightText
              text={intl.formatMessage({
                id: `quote.status.${effectiveStatus}`,
                defaultMessage: formatStatusLabel(effectiveStatus),
              })}
              highlight={searchQuery}
            />
          </Badge>
        </div>
      </div>
      <div className="flex justify-between items-center gap-4 px-4 py-2">
        <div>
          <Button
            size="sm"
            className="max-w-sm px-12"
            onClick={handleQuoteClick}
          >
            {intl.formatMessage({
              id: "quotes.card.view",
              defaultMessage: "View",
            })}
          </Button>
        </div>
        {isLoadingDetails && (
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <LoaderIcon className="h-4 w-4 animate-spin" />
            {intl.formatMessage({
              id: "quotes.card.loadingBillDetails",
              defaultMessage: "Loading bill details...",
            })}
          </div>
        )}
        {detailsError && (
          <div className="text-sm text-red-500">
            {intl.formatMessage({
              id: "quotes.card.error.billInfo",
              defaultMessage: "Error loading bill information",
            })}
          </div>
        )}
        {bill && (
          <ParticipantsOverviewCard
            drawee={bill.drawee}
            drawer={bill.drawer}
            payee={bill.payee}
            holder={bill.endorsees}
          />
        )}
        {!isLoadingDetails && !detailsError && !bill && (
          <div className="text-sm text-gray-400">
            {intl.formatMessage({
              id: "quotes.card.noBillData",
              defaultMessage: "No bill data available",
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

