import { Breadcrumbs } from "@/components/Breadcrumbs"
import { PageTitle } from "@/components/PageTitle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { IdentityPublicData, InfoReply } from "@/generated/client"
import {
  adminLookupQuoteOptions,
  adminLookupQuoteQueryKey,
  adminUpdateQuoteMutation,
} from "@/generated/client/@tanstack/react-query.gen"
import useLocalStorage from "@/hooks/use-local-storage"
import { cn } from "@/lib/utils"
import { formatDate, humanReadableDuration } from "@/utils/dates"
import { randomAvatar } from "@/utils/dev"
import { formatNumber, truncateString } from "@/utils/strings"
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
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

function QuoteActions({ value, isFetching }: { value: InfoReply; isFetching: boolean }) {
  const [offerFormData, setOfferFormData] = useState<OfferFormResult>()
  const [offerFormDrawerOpen, setOfferFormDrawerOpen] = useState(false)
  const [offerConfirmDrawerOpen, setOfferConfirmDrawerOpen] = useState(false)
  const [denyConfirmDrawerOpen, setDenyConfirmDrawerOpen] = useState(false)

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

  const onDenyQuote = () => {
    toast.loading("Denying quote…", { id: `quote-${value.id}-deny` })
    denyQuote.mutate({
      path: {
        id: value.id,
      },
      body: {
        action: "deny",
      },
    })
  }

  const onOfferQuote = (result: OfferFormResult) => {
    toast.loading("Offering quote…", { id: `quote-${value.id}-offer` })
    offerQuote.mutate({
      path: {
        id: value.id,
      },
      body: {
        action: "offer",
        discount: result.discount.net.value.div(result.discount.gross.value).toFixed(4),
        ttl: result.ttl.ttl.getTime().toFixed(0),
      },
    })
  }

  return (
    <div className="flex items-center gap-2">
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
          disabled={isFetching || denyQuote.isPending || value.status !== "pending"}
          variant={value.status !== "pending" ? "outline" : "destructive"}
        >
          Deny {denyQuote.isPending && <LoaderIcon className="stroke-1 animate-spin" />}
        </Button>
      </DenyConfirmDrawer>
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
        <Button className="flex-1" disabled={isFetching || offerQuote.isPending || value.status !== "pending"}>
          Offer {offerQuote.isPending && <LoaderIcon className="stroke-1 animate-spin" />}
        </Button>
      </OfferFormDrawer>
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
  holder?: IdentityPublicData
  payee?: IdentityPublicData
  className?: string
}) {
  return (
    <div className={cn("flex gap-2 items-center py-1", className)}>
      <div>
        <IdentityPublicDataAvatar value={drawee} tooltip="Drawee" />
      </div>
      <div>
        <IdentityPublicDataAvatar value={drawer} tooltip="Drawer" />
      </div>
      <div>
        <IdentityPublicDataAvatar value={payee} tooltip="Payee" />
      </div>
      <div>
        <IdentityPublicDataAvatar value={payee} tooltip="Holder" />
      </div>
    </div>
  )
}

function IdentityPublicDataAvatar({ value, tooltip }: { value?: IdentityPublicData; tooltip?: React.ReactNode }) {
  const avatar = (
    <Avatar>
      <AvatarImage src={randomAvatar(value?.node_id.startsWith("03") ? "men" : "women", value?.node_id)} />
      <AvatarFallback>{value?.name}</AvatarFallback>
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

function IdentityPublicDataCard({ value }: { value?: IdentityPublicData }) {
  return (
    <div className="flex gap-0.5 items-center">
      <div className="px-1 me-4">
        <IdentityPublicDataAvatar value={value} />
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

function Quote({ value, isFetching }: { value: InfoReply; isFetching: boolean }) {
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
              <IdentityPublicDataCard value={value.bill?.payee} />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <QuoteActions value={value} isFetching={isFetching} />
    </div>
  )
}

function DevSection({ id }: { id: InfoReply["id"] }) {
  const [devMode] = useLocalStorage("devMode", false)

  const { data } = useSuspenseQuery({
    ...adminLookupQuoteOptions({
      path: {
        id,
      },
    }),
  })

  return (
    <>
      {devMode && (
        <>
          <pre className="text-sm bg-accent text-accent-foreground rounded-lg p-2 my-2">
            {JSON.stringify(data, null, 2)}
          </pre>
        </>
      )}
    </>
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
        <DevSection id={id} />
      </Suspense>
    </>
  )
}
