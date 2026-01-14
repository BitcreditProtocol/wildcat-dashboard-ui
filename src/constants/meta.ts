import { env } from "@/lib/env"

export default {
  devModeEnabled: env.devModeEnabled,
  apiBaseUrl: env.apiBaseUrl,
  apiMocksEnabled: env.apiMocksEnabled,
  crowdinInContextToolingEnabled: env.crowdinInContextToolingEnabled,
}
