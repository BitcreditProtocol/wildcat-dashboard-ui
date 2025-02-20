import { INFO } from "@/constants/endpoints";
import { apiFetch } from "@/utils/api";

export interface InfoResponse {
  version: string
}

export async function fetchInfo(): Promise<InfoResponse> {
  return apiFetch<InfoResponse>(INFO, {
    headers: {
      "Content-Type": "application/json",
    },
  })
}
