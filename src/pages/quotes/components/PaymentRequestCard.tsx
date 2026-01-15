import { TruncatedTextPopover } from "@/components/TruncatedTextPopover.tsx"

interface PaymentRequestCardProps {
  addressToPay?: string
  linkToPay?: string
  effectiveRequestTime: number | null
  effectiveDeadlineTs: number | null
}

export function PaymentRequestCard({
  addressToPay,
  linkToPay,
  effectiveRequestTime,
  effectiveDeadlineTs,
}: PaymentRequestCardProps) {
  return (
    <div className="mt-4 p-4 bg-white rounded border">
      <h2 className="text-2xl font-extrabold tracking-tight mb-3">Payment request</h2>
      <div className="space-y-1">
        {addressToPay && (
          <div className="flex items-center gap-2">
            <span className="font-bold w-32">Address to pay</span>
            <TruncatedTextPopover text={addressToPay} maxLength={64} className="font-mono text-sm" />
          </div>
        )}
        {linkToPay && (
          <div className="flex items-center gap-2">
            <span className="font-bold w-32">Link to mempool</span>
            <a
              href={linkToPay}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline flex items-center"
            >
              <TruncatedTextPopover text={linkToPay} maxLength={48} className="font-mono text-sm" />
            </a>
          </div>
        )}
        {effectiveRequestTime && (
          <div className="flex items-center gap-2">
            <span className="font-bold w-32">Requested at</span>
            <span className="text-sm">
              {new Date(effectiveRequestTime * 1000).toLocaleString()}
            </span>
          </div>
        )}
        {effectiveDeadlineTs && (
          <div className="flex items-center gap-2">
            <span className="font-bold w-32">Deadline</span>
            <span className="text-sm">
              {new Date(effectiveDeadlineTs * 1000).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
