import { queryOptions } from "@tanstack/react-query";
import { client } from "@/generated/client/client.gen";
import type {
  EbillPaymentComplete,
  GetEbillMintCompleteErrors,
  GetEbillMintCompleteResponses,
} from "@/generated/client/types.gen";

export interface EbillMintCompleteQueryOptions {
  billId: string;
}

export function getEbillMintCompleteQueryOptions({
  billId,
}: EbillMintCompleteQueryOptions) {
  return queryOptions<
    EbillPaymentComplete,
    GetEbillMintCompleteErrors[keyof GetEbillMintCompleteErrors],
    EbillPaymentComplete
  >({
    queryKey: ["ebill-mint-complete", billId],
    queryFn: async () => {
      const { data } = await client.get<
        GetEbillMintCompleteResponses,
        GetEbillMintCompleteErrors,
        true
      >({
        url: `/v1/admin/treasury/ebill/payment_complete/${billId}`,
        throwOnError: true,
      });

      return data;
    },
  });
}
