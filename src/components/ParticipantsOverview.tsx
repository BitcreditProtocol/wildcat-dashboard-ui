import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getDeterministicColor, getInitials } from "@/utils/strings"
import type { BillIdentParticipant, BillParticipant, BillAnonParticipant } from "@/generated/client/types.gen"
import { cn } from "@/lib/utils"
import { TruncatedTextPopover } from "@/components/TruncatedTextPopover"
import { UserAnonymousIcon } from "@/components/icons/UserAnonymous"
import React from "react"

type IdentityPublicData = BillIdentParticipant
type AnonPublicData = BillAnonParticipant
type PayeePublicData = BillParticipant

function AnonPublicAvatar({ value, tooltip }: { value?: AnonPublicData; tooltip?: React.ReactNode }) {
  const initials = "?"
  const backgroundColor = getDeterministicColor(value?.node_id)

  const avatar = (
    <Avatar className="h-8 w-8 rounded-full">
      <AvatarFallback className="text-white font-semibold text-sm bg-transparent" style={{ backgroundColor }}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )

  return !tooltip ? (
    avatar
  ) : (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{avatar}</TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function IdentityPublicAvatar({ value, tooltip }: { value?: IdentityPublicData; tooltip?: React.ReactNode }) {
  const initials = getInitials(value?.name)
  const backgroundColor = getDeterministicColor(value?.name ?? value?.node_id)
  const isCompany = (value?.type as unknown as number) === 1
  const shapeClass = isCompany ? "rounded-lg" : "rounded-full"

  const avatar = (
    <Avatar className={cn("h-8 w-8", shapeClass)}>
      <AvatarFallback className={cn("text-white font-semibold text-sm bg-transparent", shapeClass)} style={{ backgroundColor }}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )

  return !tooltip ? (
    avatar
  ) : (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{avatar}</TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function PayeePublicDataAvatar({ value, tooltip }: { value?: PayeePublicData; tooltip?: React.ReactNode }) {
  if (!value) return null

  if ("Ident" in value) {
    const identData = value.Ident
    return <IdentityPublicAvatar value={identData} tooltip={tooltip} />
  } else if ("Anon" in value) {
    const anonData = value.Anon
    return <AnonPublicAvatar value={anonData} tooltip={tooltip} />
  }

  return null
}

export function ParticipantsOverviewCard({
  drawee,
  drawer,
  payee,
  holder,
  className,
}: {
  drawee?: IdentityPublicData
  drawer?: IdentityPublicData
  holder?: PayeePublicData
  payee?: PayeePublicData
  className?: string
}) {
  return (
    <span className={cn("flex gap-1 items-center", className)}>
      {drawee && (
        <div>
          <IdentityPublicAvatar value={drawee} tooltip="Drawee" />
        </div>
      )}
      {drawer && (
        <div>
          <IdentityPublicAvatar value={drawer} tooltip="Drawer" />
        </div>
      )}
      {payee && (
        <div>
          <PayeePublicDataAvatar value={payee} tooltip="Payee" />
        </div>
      )}
      {holder && (
        <div>
          <PayeePublicDataAvatar value={holder} tooltip="Holder" />
        </div>
      )}
    </span>
  )
}

export function ParticipantDetail({
  participant,
}: {
  participant: BillIdentParticipant | BillParticipant | undefined
}) {
  if (!participant) return null

  let data: BillIdentParticipant | undefined
  let avatar: React.ReactNode

  if ("Anon" in participant) {
    return (
      <div className="flex items-start gap-3">
        <UserAnonymousIcon className="h-5 w-5 text-muted-foreground" />
        <div className="flex flex-col gap-1">
          <div className="text-sm text-muted-foreground">Bearer</div>
        </div>
      </div>
    )
  } else if ("Ident" in participant) {
    data = participant.Ident
    avatar = <IdentityPublicAvatar value={data} />
  } else {
    data = participant
    avatar = <IdentityPublicAvatar value={data} />
  }

  if (!data) {
    return null
  }

  return (
    <div className="flex items-center justify-center gap-3">
      {avatar}
      <div className="flex flex-col gap-1">
        <TruncatedTextPopover
          text={data.name}
          maxLength={50}
          className="text-sm font-medium"
          as="span"
        />
        {data.email && (
          <a href={`mailto:${data.email}`} className="text-sm text-blue-600 hover:underline">
            <TruncatedTextPopover
              text={data.email}
              maxLength={40}
              className="text-sm"
              as="span"
            />
          </a>
        )}
        {"city" in data && data.city && data.country && (
          <div className="text-xs text-muted-foreground">
            <TruncatedTextPopover
              text={`${data.city}, ${data.country}`}
              maxLength={50}
              className="text-xs"
              as="span"
            />
          </div>
        )}
        <div className="text-xs text-muted-foreground font-mono break-all">
          <TruncatedTextPopover
            text={data.node_id}
            maxLength={50}
            className="text-sm font-medium"
            as="span"
            showFullOnDesktop
          />
        </div>
      </div>
    </div>
  )
}
