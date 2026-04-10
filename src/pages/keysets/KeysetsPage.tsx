import { PageTitle } from "@/components/PageTitle";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useQuery } from "@tanstack/react-query";
import { listKeysetInfosOptions } from "@/generated/client/@tanstack/react-query.gen";
import { FormattedMessage, useIntl } from "react-intl";
import SearchComponent from "@/components/ui/search";
import { SortButtons } from "@/components/SortButtons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KeysetLoader } from "@/pages/keysets/components/KeysetLoader";
import { KeysetCard } from "@/pages/keysets/components/KeysetCard";
import { useKeysetFiltering } from "@/hooks/use-keyset-filtering";

const KEYSETS_POLL_INTERVAL_MS = 10_000;

function PageBody() {
  const intl = useIntl();
  const { data: keysetsResponse, isLoading: keysetsLoading } = useQuery({
    ...listKeysetInfosOptions(),
    refetchInterval: KEYSETS_POLL_INTERVAL_MS,
  });
  const keysets = keysetsResponse?.data ?? [];

  const {
    searchQuery,
    setSearchQuery,
    keysetFilter,
    setKeysetFilter,
    sortBy,
    toggleSort,
    sortedKeysets,
    noExpiryText,
    sortOptions,
    filterOptions,
  } = useKeysetFiltering(keysets);

  if (keysetsLoading) {
    return <KeysetLoader />;
  }

  if (!keysets || keysets.length === 0) {
    return (
      <div className="p-4 text-muted-foreground">
        <FormattedMessage
          id="keysets.empty"
          defaultMessage="No keysets found"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <SearchComponent
            value={searchQuery}
            className="flex-1 max-w-md"
            placeholder={intl.formatMessage({
              id: "keysets.search.placeholder",
              defaultMessage:
                "Search by keyset ID, currency, maturity date, or status...",
            })}
            onSearch={setSearchQuery}
            onChange={setSearchQuery}
            size="sm"
          />
          <Select
            value={keysetFilter}
            onValueChange={(value) =>
              setKeysetFilter(value as typeof keysetFilter)
            }
          >
            <SelectTrigger className="h-11 w-full sm:w-1/3 sm:min-w-0 sm:max-w-64">
              <SelectValue
                placeholder={intl.formatMessage({
                  id: "keysets.filter.label",
                  defaultMessage: "Filter",
                })}
              />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <SortButtons
          sortBy={sortBy}
          onSortChange={toggleSort}
          options={sortOptions}
        />
      </div>

      {sortedKeysets.length === 0 ? (
        <div className="p-4 text-muted-foreground text-center">
          <FormattedMessage
            id="keysets.search.noMatch"
            defaultMessage="No keysets match your search criteria"
          />
        </div>
      ) : (
        <>
          {sortedKeysets.map((keyset) => (
            <KeysetCard
              key={keyset.id}
              keyset={keyset}
              searchQuery={searchQuery}
              noExpiryText={noExpiryText}
            />
          ))}
        </>
      )}
    </div>
  );
}

export default function KeysetsPage() {
  return (
    <>
      <Breadcrumbs>
        <FormattedMessage
          id="keysets.page.title"
          defaultMessage="Keysets"
        />
      </Breadcrumbs>
      <PageTitle>
        <FormattedMessage
          id="keysets.page.title"
          defaultMessage="Keysets"
        />
      </PageTitle>
      <PageBody />
    </>
  );
}
