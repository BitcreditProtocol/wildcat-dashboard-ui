import { queryOptions } from "@tanstack/react-query";
import { getEbillPaymentstatus } from "@/generated/client/sdk.gen";
import type { GetEbillPaymentstatusErrors } from "@/generated/client/types.gen";

export interface EbillMintCompleteQueryOptions {
  billId: string;
}

export interface EbillMintComplete {
  complete: boolean;
}

export function getEbillMintCompleteQueryOptions({ billId }: EbillMintCompleteQueryOptions) {
  return queryOptions<EbillMintComplete, GetEbillPaymentstatusErrors[keyof GetEbillPaymentstatusErrors], EbillMintComplete>({
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
