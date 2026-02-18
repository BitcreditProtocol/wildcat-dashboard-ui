export const QR_CODE_MAX_LENGTH = 2956

export function canGenerateQRCode(text: string): boolean {
  return text.length <= QR_CODE_MAX_LENGTH
}

export async function canGenerateQRCodeAsync(text: string): Promise<boolean> {
  if (text.length > QR_CODE_MAX_LENGTH) {
    return false
  }

  try {
    const { toString } = await import("qrcode")
    await toString(text, { errorCorrectionLevel: "M" })
    return true
  } catch {
    return false
  }
}
