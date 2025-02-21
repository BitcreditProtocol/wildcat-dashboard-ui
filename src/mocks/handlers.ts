import { fetchAdminQuotePending } from "./handlers/admin_quotes"
import { fetchInfo } from "./handlers/info"

export const handlers = [fetchInfo, fetchAdminQuotePending]
