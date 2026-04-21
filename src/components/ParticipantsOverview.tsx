import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getDeterministicColor, getInitials } from "@/utils/strings";
import type { BillIdentParticipant, BillParticipant, BillAnonParticipant } from "@/generated/client/types.gen";
import { cn } from "@/lib/utils";
import { TruncatedTextPopover } from "@/components/TruncatedTextPopover";
import { UserAnonymousIcon } from "@/components/icons/UserAnonymous";
import type React from "react";
import { useIntl } from "react-intl";

type IdentityPublicData = BillIdentParticipant;
type AnonPublicData = BillAnonParticipant;
type IdentOrAnonParticipant = BillParticipant;

function AnonPublicAvatar({ value, tooltip }: { value?: AnonPublicData; tooltip?: React.ReactNode }) {
  const initials = "?";
  const backgroundColor = getDeterministicColor(value?.node_id);

  const avatar = (
    <Avatar className="h-8 w-8 rounded-full">
      <AvatarFallback className="text-white font-semibold text-sm bg-transparent" style={{ backgroundColor }}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );

  if (!tooltip) {
    return avatar;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{avatar}</TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function IdentityPublicAvatar({ value, tooltip }: { value?: IdentityPublicData; tooltip?: React.ReactNode }) {
  const initials = getInitials(value?.name);
  const backgroundColor = getDeterministicColor(value?.name ?? value?.node_id);
  const isCompany = (value?.type as unknown as number) === 1;
  const shapeClass = isCompany ? "rounded-lg" : "rounded-full";

  const avatar = (
    <Avatar className={cn("h-8 w-8", shapeClass)}>
      <AvatarFallback className={cn("text-white font-semibold text-sm bg-transparent", shapeClass)} style={{ backgroundColor }}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );

  if (!tooltip) {
    return avatar;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{avatar}</TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function IdentOrAnonAvatar({ value, tooltip }: { value?: IdentOrAnonParticipant; tooltip?: React.ReactNode }) {
  if (!value) {
    return null;
  }

  if ("Ident" in value) {
    const identData = value.Ident;
    return <IdentityPublicAvatar value={identData} tooltip={tooltip} />;
  } else if ("Anon" in value) {
    const anonData = value.Anon;
    return <AnonPublicAvatar value={anonData} tooltip={tooltip} />;
  }

  return null;
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
    const defaults = {
      drawee: "Drawee",
      drawer: "Drawer",
      payee: "Payee",
      holder: "Holder",
    };
    return intl.formatMessage(
      {
        id: `participants.role.${role}`,
        defaultMessage: defaults[role],
      },
      {}
    );
  };
  const bearerLabel = intl.formatMessage({
    id: "participants.role.bearer",
    defaultMessage: "Bearer",
  });

  const getIdentTooltip = (data: IdentityPublicData | undefined, role: string) => {
    if (!data) {
      return role;
    }
    return (
      <div className="flex flex-col gap-1 max-w-xs">
        <div className="font-semibold break-words">{role}</div>
        <div className="break-words">{data.name}</div>
        {data.email && <div className="text-xs break-words">{data.email}</div>}
        {data.city && data.country && (
          <div className="text-xs break-words">
            {data.city}, {data.country}
          </div>
        )}
        <div className="text-xs font-mono break-all">{data.node_id}</div>
      </div>
    );
  };

  const getIdentOrAnonTooltip = (data: IdentOrAnonParticipant | undefined, role: string) => {
    if (!data) {
      return role;
    }

    if ("Ident" in data) {
      const identData = data.Ident;
      return (
        <div className="flex flex-col gap-1 max-w-xs">
          <div className="font-semibold break-words">{role}</div>
          <div className="break-words">{identData.name}</div>
          {identData.email && <div className="text-xs break-words">{identData.email}</div>}
          {identData.city && identData.country && (
            <div className="text-xs break-words">
              {identData.city}, {identData.country}
            </div>
          )}
          <div className="text-xs font-mono break-all">{identData.node_id}</div>
        </div>
      );
    } else if ("Anon" in data) {
      const anonData = data.Anon;
      return (
        <div className="flex flex-col gap-1 max-w-xs">
          <div className="font-semibold break-words">{role}</div>
          <div className="break-words">{bearerLabel}</div>
          {anonData?.node_id && <div className="text-xs font-mono break-all">{anonData.node_id}</div>}
        </div>
      );
    }

    return role;
  };

  return (
    <span className={cn("flex gap-1 items-center", className)}>
      {drawee && (
        <div>
          <IdentityPublicAvatar value={drawee} tooltip={getIdentTooltip(drawee, getRoleLabel("drawee"))} />
        </div>
      )}
      {drawer && (
        <div>
          <IdentityPublicAvatar value={drawer} tooltip={getIdentTooltip(drawer, getRoleLabel("drawer"))} />
        </div>
      )}
      {payee && (
        <div>
          <IdentOrAnonAvatar value={payee} tooltip={getIdentOrAnonTooltip(payee, getRoleLabel("payee"))} />
        </div>
      )}
      {holder && holder.length > 0 && (
        <div>
          <IdentOrAnonAvatar
            value={holder[holder.length - 1]}
            tooltip={getIdentOrAnonTooltip(holder[holder.length - 1], getRoleLabel("holder"))}
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
          {anonData?.node_id && (
            <div className="text-xs text-muted-foreground font-mono break-all">
              <TruncatedTextPopover text={anonData.node_id} maxLength={50} className="text-sm font-medium" as="span" showFullOnDesktop />
            </div>
          )}
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
        <div className="text-xs text-muted-foreground font-mono break-all">
          <TruncatedTextPopover text={data.node_id} maxLength={50} className="text-sm font-medium" as="span" showFullOnDesktop />
        </div>
      </div>
    </div>
  );
}
