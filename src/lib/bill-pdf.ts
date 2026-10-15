import {
  BILL_PDF_BEARER_NAME,
  BILL_PDF_ENDORSING_BLOCK_TYPES,
  type BillPdfContent,
  type BillPdfEndorsement,
  billPdfAmountInWords,
  billPdfEndorsementLabel,
  DEFAULT_BILL_PDF_LABELS,
  formatBillPdfAddress,
  formatBillPdfAddressLines,
  formatBillPdfAmount,
  formatBillPdfDate,
  formatBillPdfDateFromSeconds,
  formatBillPdfLocation,
  formatBillPdfPlace,
} from "@bitcredit/ui-library/bill-pdf";
import type { BillHistoryBlock, BillParticipant, BitcreditBill, SignedBy } from "@/generated/client/types.gen";

function participantName(participant: BillParticipant): string {
  return "Ident" in participant ? participant.Ident.name : BILL_PDF_BEARER_NAME;
}

function participantAddress(participant: BillParticipant) {
  return "Ident" in participant ? participant.Ident : null;
}

function signatureName(signed: SignedBy): string {
  const signatoryName = signed.signatory?.name?.trim();

  if (signatoryName) {
    return signatoryName;
  }

  return participantName(signed.data);
}

function latestSignatoryName(historyBlocks: BillHistoryBlock[], blockType: string, signerNodeId: string): string {
  const latest = historyBlocks
    .filter((block) => block.block_type === blockType && "Ident" in block.signed.data && block.signed.data.Ident.node_id === signerNodeId)
    .reduce<BillHistoryBlock | undefined>(
      (found, block) => (!found || block.signing_timestamp > found.signing_timestamp ? block : found),
      undefined
    );

  return latest?.signed.signatory?.name?.trim() ?? "";
}

export function billPdfContentFromBill(bill: BitcreditBill, historyBlocks: BillHistoryBlock[] = []): BillPdfContent {
  const { data, participants, status } = bill;
  const payer = participants.drawee;
  const issuer = participants.drawer;
  const isPayeeBearer = "Anon" in participants.payee;
  const isAccepted = status.acceptance.accepted;

  const waitingState = bill.current_waiting_state;
  const paymentAddress = waitingState && "Payment" in waitingState ? waitingState.Payment.payment_data.address_to_pay.trim() : "";

  const payerSignatoryName = isAccepted && payer.type === "Company" ? latestSignatoryName(historyBlocks, "Accept", payer.node_id) : "";
  const issuerSignatoryName = issuer.type === "Company" ? latestSignatoryName(historyBlocks, "Issue", issuer.node_id) : "";
  const amountDisplay = formatBillPdfAmount(data.sum, data.currency);
  const payerLines = formatBillPdfAddressLines(payer);
  const issuerLines = formatBillPdfAddressLines(issuer);

  return {
    issuingPlace: formatBillPdfLocation(data.city_of_issuing, data.country_of_issuing, data.issue_date),
    paymentPlace: formatBillPdfLocation(data.city_of_payment, data.country_of_payment),
    maturityDate: formatBillPdfDate(data.maturity_date),
    payeeName: participantName(participants.payee),
    payeeAddress: isPayeeBearer ? "" : formatBillPdfAddress(participantAddress(participants.payee)),
    amountDisplay,
    amountInWords: billPdfAmountInWords(data.sum, data.currency, DEFAULT_BILL_PDF_LABELS.amountWords),
    payerName: payer.name,
    payerSignatureName: payerSignatoryName || payer.name,
    payerAddress: formatBillPdfAddress(payer),
    payerAddressLine1: payerLines.line1,
    payerAddressLine2: payerLines.line2,
    issuerName: issuer.name,
    issuerSignatureName: issuerSignatoryName || issuer.name,
    issuerAddress: formatBillPdfAddress(issuer),
    issuerAddressLine1: issuerLines.line1,
    issuerAddressLine2: issuerLines.line2,
    isAccepted,
    isPayeeBearer,
    hasInvoice: data.files.length > 0,
    isPaymentRequested: status.payment.requested_to_pay && paymentAddress.length > 0,
    paymentAddress,
  };
}

export function billPdfEndorsementsFromHistory(historyBlocks: BillHistoryBlock[] = []): BillPdfEndorsement[] {
  return [...historyBlocks]
    .sort((a, b) => a.signing_timestamp - b.signing_timestamp)
    .filter((block) => BILL_PDF_ENDORSING_BLOCK_TYPES.includes(block.block_type) && !("Anon" in block.signed.data))
    .map((block) => {
      const payTo = block.pay_to_the_order_of;
      const payeeName = payTo ? participantName(payTo) : participantName(block.signed.data);
      const payeeLines = formatBillPdfAddressLines(payTo ? participantAddress(payTo) : block.signing_address);

      return {
        label: billPdfEndorsementLabel(payeeName === BILL_PDF_BEARER_NAME),
        payeeName,
        payeeAddressLine1: payeeLines.line1,
        payeeAddressLine2: payeeLines.line2,
        signerName: participantName(block.signed.data),
        signatureName: signatureName(block.signed),
        signaturePlace: formatBillPdfPlace(block.signing_address),
        signatureDate: formatBillPdfDateFromSeconds(block.signing_timestamp),
      };
    });
}
