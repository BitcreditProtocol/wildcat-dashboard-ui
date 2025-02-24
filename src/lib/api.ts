import { BALANCES, INFO } from "@/constants/endpoints"
import { apiFetch } from "@/utils/api"

export interface InfoResponse {
  name?: string
  pubkey?: string
  version?: string
  description?: string
  description_long?: string
  contact?: {
    method?: string
    info?: string
  }[]
  motd?: string
  icon_url?: string
  urls?: string[]
  time?: number
  nuts?: Record<
    string,
    {
      methods?: Record<string, unknown>[]
      disabled?: boolean
      supported?: boolean
    }
  >
}

export async function fetchInfo(): Promise<InfoResponse> {
  return apiFetch<InfoResponse>(INFO, {
    headers: {
      "Content-Type": "application/json",
    },
  })
}

export interface BalancesResponse {
  bitcoin: {
    value: string
    currency: string
  }
  eiou: {
    value: string
    currency: string
  }
  debit: {
    value: string
    currency: string
  }
  credit: {
    value: string
    currency: string
  }
}

export async function fetchBalances(): Promise<BalancesResponse> {
  return apiFetch<BalancesResponse>(BALANCES, {
    headers: {
      "Content-Type": "application/json",
    },
  })
}
