import { API_URL } from "@/constants/api"
import { BALANCES, INFO } from "@/constants/endpoints"

const apiFetch = async <T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const url = `${API_URL}${endpoint}`

  const response = await fetch(url, {
    ...options,
    /* headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    }, */
    headers: options.headers ?? [],
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.statusText}`)
  }

  const contentLength = response.headers.get("Content-Length")

  if (contentLength === "0" || response.headers.get("Content-Type")?.includes("application/json") === false) {
    return {} as T
  }

  return response.json() as Promise<T>
}

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
