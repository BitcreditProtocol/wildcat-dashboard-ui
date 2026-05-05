import { queryOptions } from "@tanstack/react-query";
import { getEbillPaymentstatus } from "@/generated/client/sdk.gen";
import type { EbillPaymentComplete, GetEbillPaymentstatusErrors } from "@/generated/client/types.gen";

export interface EbillMintCompleteQueryOptions {
  billId: string;
}

export function getEbillMintCompleteQueryOptions({ billId }: EbillMintCompleteQueryOptions) {
  return queryOptions<EbillPaymentComplete, GetEbillPaymentstatusErrors[keyof GetEbillPaymentstatusErrors], EbillPaymentComplete>({
    queryKey: ["ebill-mint-complete", billId],
    queryFn: async ({ signal }) => {
      const { data } = await getEbillPaymentstatus<true>({
        path: { bid: billId },
        throwOnError: true,
        signal,
      });

      return { complete: data.payment_status.paid };
    },
  });
}
