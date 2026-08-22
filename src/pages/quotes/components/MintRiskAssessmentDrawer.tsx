import { ConfirmDrawer } from "@/components/Drawers";
import { useState, type ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";

export interface MintAuthorityEvidenceFormValue {
  signedEvidence: Record<string, unknown>;
  writtenBasis: string;
}

export type MintRiskAssessmentFormValue = MintAuthorityEvidenceFormValue;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function MintRiskAssessmentDrawer({
  open,
  onOpenChange,
  isPending,
  kind = "risk",
  onSubmit,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  kind?: "risk" | "capacity";
  onSubmit: (value: MintAuthorityEvidenceFormValue) => void;
  children: ReactNode;
}) {
  const intl = useIntl();
  const [signedEvidence, setSignedEvidence] = useState<Record<string, unknown>>();
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [writtenBasis, setWrittenBasis] = useState("");
  const authority = signedEvidence?.evidence;
  const authoritySummary = record(authority)
    ? [authority.assessedBy, authority.validThrough, authority.keyId].filter((value): value is string => typeof value === "string")
    : [];
  const valid = signedEvidence !== undefined && writtenBasis.trim().length >= 20;
  const copy =
    kind === "risk"
      ? {
          title: intl.formatMessage({
            id: "quotes.mintRisk.title",
            defaultMessage: "Import signed risk assessment",
            description: "Title of the external signed acceptor risk assessment import form",
          }),
          description: intl.formatMessage({
            id: "quotes.mintRisk.description",
            defaultMessage:
              "Import an Ed25519-signed assessment from an approved risk authority. The Mint verifies its signature, acceptor binding, method and validity before re-evaluating the case.",
            description: "Explanation of the signed risk authority import workflow",
          }),
          submit: intl.formatMessage({
            id: "quotes.mintRisk.submit",
            defaultMessage: "Verify, import and re-evaluate",
            description: "Submit button for an externally signed risk assessment",
          }),
        }
      : {
          title: intl.formatMessage({
            id: "quotes.mintCapacity.title",
            defaultMessage: "Import signed capacity snapshot",
            description: "Title of the external signed Mint capacity snapshot import form",
          }),
          description: intl.formatMessage({
            id: "quotes.mintCapacity.description",
            defaultMessage:
              "Import an Ed25519-signed snapshot from the approved capacity authority. The Mint verifies its signature, Mint binding, method and validity before re-evaluating the case.",
            description: "Explanation of the signed capacity authority import workflow",
          }),
          submit: intl.formatMessage({
            id: "quotes.mintCapacity.submit",
            defaultMessage: "Verify, import and re-evaluate",
            description: "Submit button for an externally signed capacity snapshot",
          }),
        };

  return (
    <ConfirmDrawer
      title={copy.title}
      description={copy.description}
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={() => signedEvidence !== undefined && onSubmit({ signedEvidence, writtenBasis: writtenBasis.trim() })}
      cancelButtonDisabled={isPending}
      submitButtonDisabled={isPending || !valid}
      submitButtonText={copy.submit}
      trigger={children}
    >
      <div className="grid gap-4 px-4">
        <label className="grid gap-2 text-sm">
          <span>
            <FormattedMessage
              id="quotes.mintRisk.signedFile"
              defaultMessage="Signed authority record (.json)"
              description="Signed Mint authority JSON file input label"
            />
          </span>
          <input
            className="rounded-md border border-input bg-background px-3 py-2"
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              setSignedEvidence(undefined);
              setFileName(file?.name ?? "");
              setFileError("");
              if (file === undefined) return;
              void file
                .text()
                .then((text) => JSON.parse(text) as unknown)
                .then((value) => {
                  if (!record(value) || !record(value.evidence) || typeof value.evidenceDigest !== "string") {
                    throw new Error("invalid record");
                  }
                  setSignedEvidence(value);
                })
                .catch(() =>
                  setFileError(
                    intl.formatMessage({
                      id: "quotes.mintRisk.signedFile.invalid",
                      defaultMessage: "This is not a readable signed authority record.",
                      description: "Error shown for an invalid signed risk authority JSON file",
                    })
                  )
                );
            }}
          />
          {fileName !== "" && <span className="text-xs text-muted-foreground">{fileName}</span>}
          {fileError !== "" && <span className="text-xs text-destructive">{fileError}</span>}
        </label>
        {authoritySummary.length > 0 && (
          <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            {authoritySummary.join(" · ")}
          </p>
        )}
        <label className="grid gap-1 text-sm">
          <span>
            <FormattedMessage
              id="quotes.mintRisk.basis"
              defaultMessage="Assessment basis"
              description="Mint risk written basis input label"
            />
          </span>
          <textarea
            className="min-h-24 rounded-md border border-input bg-background px-3 py-2"
            maxLength={2000}
            value={writtenBasis}
            onChange={(event) => setWrittenBasis(event.target.value)}
            placeholder={intl.formatMessage({
              id: "quotes.mintRisk.basis.placeholder",
              defaultMessage: "Explain the source, method and reviewer conclusion",
              description: "Mint risk written basis placeholder",
            })}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          <FormattedMessage
            id="quotes.mintRisk.syntheticNotice"
            defaultMessage="The browser does not establish trust. The Mint verifies the signature and configured authority; testnet records remain visibly synthetic."
            description="Trust-boundary notice for signed Mint risk evidence"
          />
        </p>
      </div>
    </ConfirmDrawer>
  );
}
