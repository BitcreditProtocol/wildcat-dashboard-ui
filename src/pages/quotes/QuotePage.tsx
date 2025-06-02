import { Breadcrumbs } from "@/components/Breadcrumbs"
import { PageTitle } from "@/components/PageTitle"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { IdentityPublicData, PayeePublicData, InfoReply, AnonPublicData, KeySetInfo } from "@/generated/client"
import {
  adminLookupQuoteOptions,
  adminLookupQuoteQueryKey,
  adminUpdateQuoteMutation,
} from "@/generated/client/@tanstack/react-query.gen"
import { activateKeyset, keysetInfo } from "@/generated/client/sdk.gen"
import { cn, getInitials } from "@/lib/utils"
import { formatDate, humanReadableDuration } from "@/utils/dates"

import { formatNumber, truncateString } from "@/utils/strings"
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { getDeterministicColor } from "@/utils/dev"

import { LoaderIcon } from "lucide-react"
import { Suspense, useMemo, useState } from "react"
import { Link, useParams } from "react-router"
import { BaseDrawer, ConfirmDrawer } from "@/components/Drawers"
import { GrossToNetDiscountForm } from "@/components/GrossToNetDiscountForm"
import Big from "big.js"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { Calendar } from "@/components/ui/calendar"
import { InputContainer } from "@/components/InputContainer"
import { addDays } from "date-fns"

function Loader() {
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <Skeleton className="h-48 rounded-lg" />
    </div>
  )
}

interface TimeToLiveFormValues {
  ttl?: Date
}

interface TimeToLiveFormResult {
  ttl: Date
}

interface TimeToLiveFormProps {
  submitButtonText?: string
  onSubmit: (values: TimeToLiveFormResult) => void
}

const TimeToLiveForm = ({ onSubmit, submitButtonText = "Submit" }: TimeToLiveFormProps) => {
  const {
    watch,
    handleSubmit,
    setValue,
    formState: { isValid, errors },
  } = useForm<TimeToLiveFormValues>({
    mode: "all",
  })

  const { ttl } = watch()

  return (
    <form
      className="flex flex-col gap-2 min-w-[8rem]"
      onSubmit={(e) => {
        handleSubmit(() => {
          if (errors.root !== undefined || ttl === undefined) return

          onSubmit({
            ttl,
          })
        })(e).catch(() => {
          // TODO
        })
      }}
    >
      <div className="flex flex-col items-center">
        <InputContainer htmlFor={"ttl"} label={<>Valid until</>}>
          <input
            id="ttl"
            step="1"
            value={ttl?.toDateString()}
            className="bg-transparent text-right focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            readOnly
          />
        </InputContainer>
        <div className="flex justify-center my-2 rounded-md border w-full">
          <Calendar
            mode="single"
            selected={ttl}
            onSelect={(day) => setValue("ttl", day)}
            hidden={{ before: addDays(new Date(Date.now()), 1) }}
          />
        </div>
      </div>

      <Button type="submit" size="sm" className="my-[16px]" disabled={!isValid}>
        {submitButtonText}
      </Button>
    </form>
  )
}

interface OfferFormResult {
  discount: Parameters<Parameters<typeof GrossToNetDiscountForm>[0]["onSubmit"]>[0]
  ttl: Parameters<Parameters<typeof TimeToLiveForm>[0]["onSubmit"]>[0]
}

interface OfferFormProps {
  discount: Omit<Parameters<typeof GrossToNetDiscountForm>[0], "onSubmit">
  onSubmit: (result: OfferFormResult) => void
}

function OfferForm({ onSubmit, discount }: OfferFormProps) {
  const [discountResult, setDiscountResult] = useState<OfferFormResult["discount"]>()
  return (
    <>
      {!discountResult ? (
        <>
          <GrossToNetDiscountForm
            {...discount}
            startDate={discount.startDate ?? new Date(Date.now())}
            onSubmit={setDiscountResult}
            submitButtonText="Next"
          />
        </>
      ) : (
        <>
          <TimeToLiveForm
            {...discount}
            onSubmit={(ttlResult) =>
              onSubmit({
                discount: discountResult,
                ttl: ttlResult,
              })
            }
            submitButtonText="Next"
          />
        </>
      )}
    </>
  )
}

type OfferFormDrawerProps = Parameters<typeof BaseDrawer>[0] & {
  value: InfoReply
  onSubmit: OfferFormProps["onSubmit"]
}

function OfferFormDrawer({ value, onSubmit, children, ...drawerProps }: OfferFormDrawerProps) {
  return (
    <BaseDrawer {...drawerProps} trigger={children}>
      <div className="px-4 pt-12">
        <OfferForm
          discount={{
            endDate: new Date(Date.parse(value.bill.maturity_date)),
            gross: {
              value: new Big(value.bill.sum),
              currency: "sat",
            },
          }}
          onSubmit={onSubmit}
        />
      </div>
    </BaseDrawer>
  )
}

type OfferConfirmDrawerProps = Parameters<typeof ConfirmDrawer>[0] & {
  onSubmit: () => void
  children?: React.ReactNode
}

function OfferConfirmDrawer({ children, onSubmit, ...drawerProps }: OfferConfirmDrawerProps) {
  return (
    <ConfirmDrawer {...drawerProps} onSubmit={onSubmit} submitButtonText="Yes, offer quote.">
      <>
        <div className="py-12 text-xl">
          Are you sure you want to <span className="ps-1 font-bold">offer the quote</span>?
        </div>
        <>{children}</>
      </>
    </ConfirmDrawer>
  )
}

type DenyConfirmDrawerProps = Parameters<typeof ConfirmDrawer>[0] & {
  onSubmit: () => void
  children?: React.ReactNode
}

function DenyConfirmDrawer({ children, onSubmit, ...drawerProps }: DenyConfirmDrawerProps) {
  return (
    <ConfirmDrawer
      {...drawerProps}
      trigger={children}
      submitButtonText="Yes, deny quote."
      submitButtonVariant="destructive"
      onSubmit={onSubmit}
    >
      <div className="py-12 text-xl">
        Are you sure you want to <span className="ps-1 font-bold">deny offering a quote</span>?
      </div>
    </ConfirmDrawer>
  )
}

function QuoteActions({
  value,
  isFetching,
  keysetActive,
}: {
  value: InfoReply
  isFetching: boolean
  keysetActive: boolean
}) {
  const [offerFormData, setOfferFormData] = useState<OfferFormResult>()
  const [offerFormDrawerOpen, setOfferFormDrawerOpen] = useState(false)
  const [offerConfirmDrawerOpen, setOfferConfirmDrawerOpen] = useState(false)
  const [denyConfirmDrawerOpen, setDenyConfirmDrawerOpen] = useState(false)
  const [activateKeysetConfirmDrawerOpen, setActivateKeysetConfirmDrawerOpen] = useState(false)

  const effectiveDiscount = useMemo(() => {
    if (!offerFormData) return
    console.table(offerFormData)
    return new Big(1).minus(offerFormData.discount.net.value.div(offerFormData.discount.gross.value))
  }, [offerFormData])

  const queryClient = useQueryClient()

  const denyQuote = useMutation({
    ...adminUpdateQuoteMutation(),
    onSettled: () => {
      toast.dismiss(`quote-${value.id}-deny`)
    },
    onError: (error) => {
      toast.error("Error while denying quote: " + error.message)
      console.warn(error)
    },
    onSuccess: () => {
      toast.success("Quote has been denied.")
      void queryClient.invalidateQueries({
        queryKey: adminLookupQuoteQueryKey({
          path: {
            id: value.id,
          },
        }),
      })
    },
  })
  const offerQuote = useMutation({
    ...adminUpdateQuoteMutation(),
    onSettled: () => {
      toast.dismiss(`quote-${value.id}-offer`)
    },
    onError: (error) => {
      toast.error("Error while offering quote: " + error.message)
      console.warn(error)
    },
    onSuccess: () => {
      toast.success("Quote has been offered.")
      void queryClient.invalidateQueries({
        queryKey: adminLookupQuoteQueryKey({
          path: {
            id: value.id,
          },
        }),
      })
    },
  })

  const activateKeysetMutation = useMutation({
    mutationFn: async () => {
      const { data } = await activateKeyset({
        body: {
          qid: value.id,
        },
        throwOnError: true,
      })
      return data
    },
    onMutate: () => {
      toast.loading("Activating keyset…", { id: `quote-${value.id}-activate-keyset` })
    },
    onSettled: () => {
      toast.dismiss(`quote-${value.id}-activate-keyset`)
    },
    onError: (error) => {
      toast.error("Error while activating keyset: " + error.message)
      console.warn(error)
    },
    onSuccess: () => {
      toast.success("Keyset has been activated.")
      void queryClient.invalidateQueries({
        queryKey: adminLookupQuoteQueryKey({
          path: {
            id: value.id,
          },
        }),
      })
    },
  })

  const onDenyQuote = () => {
    toast.loading("Denying quote…", { id: `quote-${value.id}-deny` })
    denyQuote.mutate({
      path: {
        id: value.id,
      },
      body: {
        action: "Deny",
      },
    })
  }

  const onOfferQuote = (result: OfferFormResult) => {
    toast.loading("Offering quote…", { id: `quote-${value.id}-offer` })

    const net_amount = result.discount.net.value.round(0, Big.roundDown).toNumber()

    offerQuote.mutate({
      path: {
        id: value.id,
      },
      body: {
        action: "Offer",
        discounted: net_amount,
        ttl: result.ttl.ttl.toISOString(),
      },
    })
  }

  const onActivateKeyset = () => {
    activateKeysetMutation.mutate()
  }

  return (
    <div className="flex items-center gap-2">
      {value.status === "Pending" ? (
        <DenyConfirmDrawer
          title="Confirm denying quote"
          open={denyConfirmDrawerOpen}
          onOpenChange={setDenyConfirmDrawerOpen}
          onSubmit={() => {
            onDenyQuote()
            setDenyConfirmDrawerOpen(false)
          }}
        >
          <Button
            className="flex-1"
            disabled={isFetching || denyQuote.isPending || value.status !== "Pending"}
            variant={value.status !== "Pending" ? "outline" : "destructive"}
          >
            Deny {denyQuote.isPending && <LoaderIcon className="stroke-1 animate-spin" />}
          </Button>
        </DenyConfirmDrawer>
      ) : (
        <></>
      )}
      {value.status === "Pending" ? (
        <OfferFormDrawer
          title="Offer quote"
          description="Make an offer to the current holder of this bill"
          value={value}
          open={offerFormDrawerOpen}
          onOpenChange={setOfferFormDrawerOpen}
          onSubmit={(data) => {
            setOfferFormData(data)
            setOfferConfirmDrawerOpen(true)
            setOfferFormDrawerOpen(false)
          }}
        >
          <Button className="flex-1" disabled={isFetching || offerQuote.isPending || value.status !== "Pending"}>
            Offer {offerQuote.isPending && <LoaderIcon className="stroke-1 animate-spin" />}
          </Button>
        </OfferFormDrawer>
      ) : (
        <></>
      )}

      <OfferConfirmDrawer
        title="Confirm offering quote"
        description="Review your inputs and confirm the offer"
        open={offerConfirmDrawerOpen}
        onOpenChange={setOfferConfirmDrawerOpen}
        onSubmit={() => {
          if (!offerFormData) return
          onOfferQuote(offerFormData)
          setOfferConfirmDrawerOpen(false)
        }}
      >
        <div className="flex flex-col justify-center gap-1 py-8 mb-8">
          <span>
            <span className="font-bold">Effective discount (relative):</span>{" "}
            {effectiveDiscount?.mul(new Big("100")).toFixed(2)}%
          </span>
          <span>
            <span className="font-bold">Effective discount (absolute):</span>{" "}
            {offerFormData?.discount.gross.value.minus(offerFormData?.discount.net.value).toFixed(0)}{" "}
            {offerFormData?.discount.net.currency}
          </span>
          <span>
            <span className="font-bold">Net amount:</span> {offerFormData?.discount.net.value.round(0).toFixed(0)}{" "}
            {offerFormData?.discount.net.currency}
          </span>
          <span>
            <span className="font-bold">Valid until:</span> {offerFormData?.ttl.ttl.toDateString()} (
            {offerFormData && humanReadableDuration("en", offerFormData.ttl.ttl)})
          </span>
        </div>
      </OfferConfirmDrawer>

      {(value.status === "Accepted" || value.status === "Offered") && "keyset_id" in value ? (
        <ConfirmDrawer
          title="Confirm activating keyset"
          description="Are you sure you want to activate the keyset for this quote?"
          open={activateKeysetConfirmDrawerOpen}
          onOpenChange={setActivateKeysetConfirmDrawerOpen}
          onSubmit={() => {
            onActivateKeyset()
            setActivateKeysetConfirmDrawerOpen(false)
          }}
          submitButtonText="Yes, activate keyset"
          trigger={
            <Button
              className="flex-1"
              disabled={isFetching || activateKeysetMutation.isPending || keysetActive}
              variant="default"
            >
              Activate Keyset {activateKeysetMutation.isPending && <LoaderIcon className="stroke-1 animate-spin" />}
            </Button>
          }
        />
      ) : (
        <></>
      )}
    </div>
  )
}

export function ParticipantsOverviewCard({
  drawee,
  drawer,
  payee,
  className,
}: {
  drawee?: IdentityPublicData
  drawer?: IdentityPublicData
  holder?: PayeePublicData
  payee?: PayeePublicData
  className?: string
}) {
  return (
    <div className={cn("flex gap-2 items-center py-1", className)}>
      <div>
        <IdentityPublicAvatar value={drawee} tooltip="Drawee" />
      </div>
      <div>
        <IdentityPublicAvatar value={drawer} tooltip="Drawer" />
      </div>
      <div>
        <PayeePublicDataAvatar value={payee} tooltip="Payee" />
      </div>
      <div>
        <PayeePublicDataAvatar value={payee} tooltip="Holder" />
      </div>
    </div>
  )
}

function AnonPublicAvatar({ value, tooltip }: { value?: AnonPublicData; tooltip?: React.ReactNode }) {
  const initials = "?"
  const backgroundColor = getDeterministicColor(value?.node_id)

  const avatar = (
    <Avatar>
      <div
        className="w-full h-full flex items-center justify-center text-white font-semibold text-sm"
        style={{ backgroundColor }}
      >
        {initials}
      </div>
    </Avatar>
  )
  return !tooltip ? (
    avatar
  ) : (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>{avatar}</TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function IdentityPublicAvatar({ value, tooltip }: { value?: IdentityPublicData; tooltip?: React.ReactNode }) {
  const initials = getInitials(value?.name)
  const backgroundColor = getDeterministicColor(value?.name ?? value?.node_id)

  const avatar = (
    <Avatar>
      <div
        className="w-full h-full flex items-center justify-center text-white font-semibold text-sm"
        style={{ backgroundColor }}
      >
        {initials}
      </div>
    </Avatar>
  )
  return !tooltip ? (
    avatar
  ) : (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>{avatar}</TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
function PayeePublicDataAvatar({ value, tooltip }: { value?: PayeePublicData; tooltip?: React.ReactNode }) {
  if (!value) return <></>

  if ("Ident" in value) {
    const identData = (value as { Ident: IdentityPublicData }).Ident
    return <IdentityPublicAvatar value={identData} tooltip={tooltip} />
  } else if ("Anon" in value) {
    const anonData = (value as { Anon: AnonPublicData }).Anon
    return <AnonPublicAvatar value={anonData} tooltip={tooltip} />
  }

  return <></>
}

function IdentityPublicDataCard({ value }: { value?: IdentityPublicData }) {
  return (
    <div className="flex gap-0.5 items-center">
      <div className="px-1 me-4">
        <IdentityPublicAvatar value={value} />
      </div>
      <div className="flex flex-col">
        <div className="font-bold">{value?.name}</div>
        <div>
          <a className="underline" href={`mailto:${value?.email}`}>
            {value?.email}
          </a>
        </div>
        <div>
          {value?.address}, {value?.zip}, {value?.city}, {value?.country}
        </div>
        <div>
          <pre>{value?.node_id}</pre>
        </div>
      </div>
    </div>
  )
}
function AnonPublicDataCard({ value }: { value?: AnonPublicData }) {
  return (
    <div className="flex gap-0.5 items-center">
      <div className="px-1 me-4">
        <AnonPublicAvatar value={value} />
      </div>
      <div className="flex flex-col">
        <div className="font-bold">{value?.node_id}</div>
        <div>
          <a className="underline" href={`mailto:${value?.email}`}>
            {value?.email}
          </a>
        </div>
        <div>
          <pre>{value?.node_id}</pre>
        </div>
      </div>
    </div>
  )
}

function PayeePublicDataCard({ value }: { value?: PayeePublicData }) {
  if (!value) return null

  console.log("Payee public data", value)

  if ("Ident" in value) {
    const identData = (value as { Ident: IdentityPublicData }).Ident
    return IdentityPublicDataCard({ value: identData })
  } else if ("Anon" in value) {
    const anonData = (value as { Anon: AnonPublicData }).Anon
    return AnonPublicDataCard({ value: anonData })
  }

  return <></>
}

function Quote({ value, isFetching }: { value: InfoReply; isFetching: boolean }) {
  console.log("Quote Page", value)

  const shouldFetchKeyset = (value.status === "Offered" || value.status === "Accepted") && "keyset_id" in value

  const keysetId = "keyset_id" in value ? value.keyset_id : ""

  const { data: keysetData } = useQuery({
    queryKey: ["keyset", keysetId],
    queryFn: () =>
      keysetInfo({
        path: { keyset_id: keysetId },
      }),
    enabled: shouldFetchKeyset,
  })

  let keysetActive = false
  if (keysetData) {
    console.log("Keyset Info:", keysetData)
    if ("data" in keysetData && keysetData.data !== undefined) {
      keysetActive = keysetData.data.active
    }
  }
  return (
    <div className="flex flex-col gap-1">
      <Table className="my-2">
        <TableBody>
          <TableRow>
            <TableCell className="font-bold">ID: </TableCell>
            <TableCell>
              <span className="font-mono">{value.id}</span>
            </TableCell>
          </TableRow>
          {(value.status === "Offered" || value.status === "Accepted") && "keyset_id" in value ? (
            <TableRow>
              <TableCell className="font-bold">Keyset ID: </TableCell>
              <TableCell className="flex items-center gap-2">
                {keysetId.length > 0 ? (
                  <Badge
                    variant={keysetActive ? "default" : "destructive"}
                    className={keysetActive ? "bg-blue-500" : "bg-red-500"}
                  >
                    {keysetId}
                  </Badge>
                ) : (
                  <></>
                )}
              </TableCell>
            </TableRow>
          ) : (
            <></>
          )}
          <TableRow>
            <TableCell className="font-bold">Status: </TableCell>
            <TableCell>
              <Badge variant={["rejected", "denied"].includes(value.status) ? "destructive" : "default"}>
                {value.status}
              </Badge>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-bold">Sum: </TableCell>
            <TableCell>{formatNumber("en", value.bill?.sum)} sat</TableCell>
          </TableRow>
          {(value.status === "Offered" ||
            value.status === "Accepted" ||
            value.status === "Rejected" ||
            value.status === "OfferExpired") &&
          "discounted" in value ? (
            <TableRow>
              <TableCell className="font-bold">Discounted: </TableCell>
              <TableCell>{formatNumber("en", value.discounted)} crsat</TableCell>
            </TableRow>
          ) : (
            <></>
          )}
          <TableRow>
            <TableCell className="font-bold">Maturity date: </TableCell>
            <TableCell>
              {!value.bill?.maturity_date ? (
                <>(empty)</>
              ) : (
                <div className="flex gap-0.5">
                  <span>{formatDate("en", new Date(Date.parse(value.bill.maturity_date)))}</span>
                  <span>({humanReadableDuration("en", new Date(Date.parse(value.bill.maturity_date)))})</span>
                </div>
              )}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-bold">Participants: </TableCell>
            <TableCell>
              <ParticipantsOverviewCard
                drawee={value.bill?.drawee}
                drawer={value.bill?.drawer}
                payee={value.bill?.payee}
                holder={value.bill?.payee}
              />
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-bold">Drawee: </TableCell>
            <TableCell>
              <IdentityPublicDataCard value={value.bill?.drawee} />
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-bold">Drawer: </TableCell>
            <TableCell>
              <IdentityPublicDataCard value={value.bill?.drawer} />
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-bold">Payee: </TableCell>
            <TableCell>
              <PayeePublicDataCard value={value.bill?.payee} />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <QuoteActions value={value} isFetching={isFetching} keysetActive={keysetActive} />
    </div>
  )
}

function PageBody({ id }: { id: InfoReply["id"] }) {
  const { data, isFetching } = useSuspenseQuery({
    ...adminLookupQuoteOptions({
      path: {
        id,
      },
    }),
  })

  return (
    <>
      <div className="flex items-center gap-1">
        {" "}
        <LoaderIcon
          className={cn("stroke-1 animate-spin", {
            "animate-spin": isFetching,
            invisible: !isFetching,
          })}
        />
      </div>
      <Quote value={data} isFetching={isFetching} />
    </>
  )
}

export default function QuotePage() {
  const { id } = useParams<{ id: InfoReply["id"] }>()

  if (!id) {
    throw Error("Missing `id` param.")
  }

  return (
    <>
      <Breadcrumbs
        parents={[
          <>
            <Link to="/quotes">Quotes</Link>
          </>,
        ]}
      >
        {id}
      </Breadcrumbs>
      <PageTitle>
        Quote <span className="font-mono">{truncateString(id, 16)}</span>
      </PageTitle>
      <Suspense fallback={<Loader />}>
        <PageBody id={id} />
      </Suspense>
    </>
  )
}
