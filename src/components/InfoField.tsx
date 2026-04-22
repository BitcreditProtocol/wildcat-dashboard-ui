import { CopyToClipboardButton } from "@bitcredit/ui-library";
import type { ReactNode } from "react";

interface InfoFieldProps {
  label: ReactNode;
  value: string;
  mono?: boolean;
  copyLabel?: string;
}

export function InfoField({ label, value, mono, copyLabel }: InfoFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center">
        <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</span>
        {copyLabel && (
          <>
            {/* TODO: CopyToClipboardButton still lacks CopyButton features used here: label-aware success/error messaging, variant/size hooks, and optional checkmark feedback. {copyLabel && <CopyButton value={value} label={copyLabel} />} */}
            <CopyToClipboardButton value={value} />
          </>
        )}
      </div>
      {mono ? (
        <span className="font-mono text-sm break-all bg-muted p-2 rounded text-muted-foreground">{value}</span>
      ) : (
        <span className="text-sm">{value}</span>
      )}
    </div>
  );
}
