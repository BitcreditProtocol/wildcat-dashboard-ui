import {
  Avatar,
  AvatarFallback,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@bitcredit/ui-library";
import { getDeterministicColor, getInitials } from "@/utils/strings";
import type { BillIdentParticipant, BillParticipant, BillAnonParticipant } from "@/generated/client/types.gen";
import { cn } from "@bitcredit/ui-library";
import { NodeIdDisplay, TruncatedTextPopover } from "@bitcredit/ui-library";
import { UserAnonymousIcon } from "@/components/icons/UserAnonymous";
import { getContactTypeMessage, participantRoleMessages } from "@/i18n/descriptors";
import type React from "react";
import { useIntl } from "react-intl";

type IdentityPublicData = BillIdentParticipant;
type AnonPublicData = BillAnonParticipant;
type IdentOrAnonParticipant = BillParticipant;

const TOOLTIP_DELAY_MS = 150;

const AVATAR_INTERACTIVE_CLASS = "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Shows the participant details on hover and keeps them pinned in a popover on click, so they stay
 * readable long enough to be selected or copied (and are reachable on touch devices).
 */
function AvatarDetails({ details, children }: { details?: React.ReactNode; children: React.ReactNode }) {
  if (!details) {
    return <>{children}</>;
  }

  return (
    <Popover>
      <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
        <Tooltip>
          <PopoverTrigger asChild>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
          </PopoverTrigger>
          <TooltipContent>{details}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent className="w-auto max-w-xs p-3 text-sm">{details}</PopoverContent>
    </Popover>
  );
}

function AnonPublicAvatar({ value, details }: { value?: AnonPublicData; details?: React.ReactNode }) {
  const initials = "?";
  const backgroundColor = getDeterministicColor(value?.node_id);

  return (
    <AvatarDetails details={details}>
      <Avatar className={cn("h-8 w-8 rounded-full", details && AVATAR_INTERACTIVE_CLASS)} tabIndex={details ? 0 : undefined}>
        <AvatarFallback className="text-white font-semibold text-sm bg-transparent" style={{ backgroundColor }}>
          {initials}
        </AvatarFallback>
      </Avatar>
    </AvatarDetails>
  );
}

function IdentityPublicAvatar({ value, details }: { value?: IdentityPublicData; details?: React.ReactNode }) {
  const initials = getInitials(value?.name);
  const backgroundColor = getDeterministicColor(value?.name ?? value?.node_id);
  const isCompany = value?.type === "Company";
  const shapeClass = isCompany ? "rounded-lg" : "rounded-full";

  return (
    <AvatarDetails details={details}>
      <Avatar className={cn("h-8 w-8", shapeClass, details && AVATAR_INTERACTIVE_CLASS)} tabIndex={details ? 0 : undefined}>
        <AvatarFallback className={cn("text-white font-semibold text-sm bg-transparent", shapeClass)} style={{ backgroundColor }}>
          {initials}
        </AvatarFallback>
      </Avatar>
    </AvatarDetails>
  );
}

function IdentOrAnonAvatar({ value, details }: { value?: IdentOrAnonParticipant; details?: React.ReactNode }) {
  if (!value) {
    return null;
  }

  if ("Ident" in value) {
    const identData = value.Ident;
    return <IdentityPublicAvatar value={identData} details={details} />;
  } else if ("Anon" in value) {
    const anonData = value.Anon;
    return <AnonPublicAvatar value={anonData} details={details} />;
  }

  return null;
}

function ParticipantSummary({ role, participant }: { role: string; participant: IdentityPublicData | IdentOrAnonParticipant }) {
  const intl = useIntl();

  const ident = "Ident" in participant ? participant.Ident : "Anon" in participant ? undefined : participant;
  const nodeId = ident?.node_id ?? ("Anon" in participant ? participant.Anon?.node_id : undefined);
  const typeMessage = getContactTypeMessage(ident?.type ?? "Anon");

  return (
    <div className="flex flex-col gap-1 max-w-xs">
      <div className="font-semibold break-words">{role}</div>
      <div className="break-words">{ident?.name ?? intl.formatMessage(participantRoleMessages.bearer)}</div>
      {typeMessage && <div className="text-xs break-words">{intl.formatMessage(typeMessage)}</div>}
      {ident?.email && <div className="text-xs break-words">{ident.email}</div>}
      {ident?.city && ident.country && (
        <div className="text-xs break-words">
          {ident.city}, {ident.country}
        </div>
      )}
      {nodeId && <div className="text-xs font-mono break-all">{nodeId}</div>}
    </div>
  );
}

export function ParticipantsOverviewCard({
  drawee,
  drawer,
  payee,
  holder,
  className,
}: {
  drawee?: IdentityPublicData;
  drawer?: IdentityPublicData;
  holder?: IdentOrAnonParticipant[];
  payee?: IdentOrAnonParticipant;
  className?: string;
}) {
  const intl = useIntl();
  const getRoleLabel = (role: "drawee" | "drawer" | "payee" | "holder") => {
    return intl.formatMessage(participantRoleMessages[role]);
  };

  const latestHolder = holder && holder.length > 0 ? holder[holder.length - 1] : undefined;

  return (
    <span className={cn("flex gap-1 items-center", className)}>
      {drawee && (
        <div>
          <IdentityPublicAvatar value={drawee} details={<ParticipantSummary role={getRoleLabel("drawee")} participant={drawee} />} />
        </div>
      )}
      {drawer && (
        <div>
          <IdentityPublicAvatar value={drawer} details={<ParticipantSummary role={getRoleLabel("drawer")} participant={drawer} />} />
        </div>
      )}
      {payee && (
        <div>
          <IdentOrAnonAvatar value={payee} details={<ParticipantSummary role={getRoleLabel("payee")} participant={payee} />} />
        </div>
      )}
      {latestHolder && (
        <div>
          <IdentOrAnonAvatar
            value={latestHolder}
            details={<ParticipantSummary role={getRoleLabel("holder")} participant={latestHolder} />}
          />
        </div>
      )}
    </span>
  );
}

export function ParticipantDetail({ participant }: { participant: BillIdentParticipant | BillParticipant | undefined }) {
  const intl = useIntl();
  if (!participant) {
    return null;
  }

  let data: BillIdentParticipant | undefined;
  let avatar: React.ReactNode;

  if ("Anon" in participant) {
    const anonData = participant.Anon;
    return (
      <div className="flex items-center gap-3">
        <UserAnonymousIcon className="h-8 w-8 text-muted-foreground" />
        <div className="flex flex-col gap-1">
          <div className="text-sm text-muted-foreground">
            {intl.formatMessage({
              id: "participants.role.bearer",
              defaultMessage: "Bearer",
            })}
          </div>
          {anonData?.node_id && <NodeIdDisplay nodeId={anonData.node_id} />}
        </div>
      </div>
    );
  } else if ("Ident" in participant) {
    data = participant.Ident;
    avatar = <IdentityPublicAvatar value={data} />;
  } else {
    data = participant;
    avatar = <IdentityPublicAvatar value={data} />;
  }

  if (!data) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-3">
      {avatar}
      <div className="flex flex-col gap-1">
        <TruncatedTextPopover text={data.name} maxLength={50} className="text-sm font-medium" as="span" />
        {data.email && (
          <a href={`mailto:${data.email}`} className="text-sm text-blue-600 hover:underline">
            <TruncatedTextPopover text={data.email} maxLength={40} className="text-sm" as="span" />
          </a>
        )}
        {"city" in data && data.city && data.country && (
          <div className="text-xs text-muted-foreground">
            <TruncatedTextPopover text={`${data.city}, ${data.country}`} maxLength={50} className="text-xs" as="span" />
          </div>
        )}
        <NodeIdDisplay nodeId={data.node_id} />
      </div>
    </div>
  );
}
