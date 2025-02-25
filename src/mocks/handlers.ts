import { fetchAdminLookupQuote, fetchAdminQuotePending, updateAdminQuote } from "./handlers/admin_quotes"
import { fetchBalances } from "./handlers/balances"
import { fetchInfo } from "./handlers/info"

export const handlers = [fetchInfo, fetchBalances, fetchAdminQuotePending, fetchAdminLookupQuote, updateAdminQuote]
