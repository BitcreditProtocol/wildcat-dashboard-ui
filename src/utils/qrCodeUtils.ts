export const QR_CODE_MAX_LENGTH = 2956

export function canGenerateQRCode(text: string): boolean {
  return text.length <= QR_CODE_MAX_LENGTH
}
