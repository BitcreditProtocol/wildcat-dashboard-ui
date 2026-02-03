import * as QRCode from "qrcode"

export const QR_CODE_MAX_LENGTH = 2956

export function canGenerateQRCode(text: string): boolean {
  if (text.length > QR_CODE_MAX_LENGTH) {
    return false
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    QRCode.create(text, { errorCorrectionLevel: "M" })
    return true
  } catch {
    return false
  }
}
