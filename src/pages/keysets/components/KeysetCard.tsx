import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Link } from "react-router";
import type { KeySetInfo } from "@/generated/client/types.gen.ts";
import SearchComponent, { HighlightText } from "@/components/ui/search.tsx";
import { FormattedMessage, useIntl } from "react-intl";

interface KeysetCardProps {
  keyset: KeySetInfo;
  searchQuery: string;
  noExpiryText: string;
}

export function KeysetCard({
  keyset,
  searchQuery,
  noExpiryText,
}: KeysetCardProps) {
  const intl = useIntl();

  const finalExpiryDate = keyset.final_expiry
    ? new Date(keyset.final_expiry * 1000)
        .toLocaleDateString("en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        })
        .replace(/(\d{2}) (\w{3}), (\d{4})/, "$1. $2. $3")
    : noExpiryText;

  const currencyUnit =
    typeof keyset.unit === "string" ? keyset.unit : keyset.unit.Custom;

  const statusText = keyset.active
    ? intl.formatMessage({
        id: "keysets.status.active",
        defaultMessage: "Active",
      })
    : intl.formatMessage({
        id: "keysets.status.inactive",
        defaultMessage: "Inactive",
      });

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Link
              to={`/keysets/${keyset.id}`}
              className="block"
            >
              <CardTitle className="font-mono text-sm">
                <HighlightText
                  text={keyset.id}
                  highlight={searchQuery}
                />
              </CardTitle>
            </Link>
            <CardDescription className="mt-1">
              <FormattedMessage
                id="keysets.card.meta"
                defaultMessage="Currency: {currency} | Maturity date: {maturityDate}"
                values={{
                  currency: (
                    <HighlightText
                      text={currencyUnit}
                      highlight={searchQuery}
                    />
                  ),
                  maturityDate: (
                    <HighlightText
                      text={finalExpiryDate}
                      highlight={searchQuery}
                    />
                  ),
                }}
              />
            </CardDescription>
          </div>
          <div className="flex gap-2 items-center">
            <Badge variant={keyset.active ? "default" : "secondary"}>
              <HighlightText
                text={statusText}
                highlight={searchQuery}
              />
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          size="sm"
          variant="default"
          className="max-w-sm px-12"
          asChild
        >
          <Link to={`/keysets/${keyset.id}`}>
            <FormattedMessage
              id="keysets.view"
              defaultMessage="View"
            />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// Re-export SearchComponent so callers importing from here don't need a separate import
export { SearchComponent };
