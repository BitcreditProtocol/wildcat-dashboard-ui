import { http, delay, HttpResponse } from "msw"
import { API_URL } from "@/constants/api"
import type { InfoResponse } from "@/lib/api"
import { INFO } from "@/constants/endpoints"

export const fetchInfo = http.get<never, never, InfoResponse>(`${API_URL}${INFO}`, async () => {
  await delay(1_000)

  return HttpResponse.json({
    "name": "Bob's Wildcat mint",
    "pubkey": "0283bf290884eed3a7ca2663fc0260de2e2064d6b355ea13f98dec004b7a7ead99",
    "version": "Nutshell/0.15.0",
    "description": "The short mint description",
    "description_long": "A description that can be a long piece of text.",
    "contact": [
      {
        "method": "email",
        "info": "contact@me.com"
      },
      {
        "method": "twitter",
        "info": "@me"
      },
      {
        "method": "nostr",
        "info": "npub..."
      }
    ],
    "motd": "Message to display to users.",
    "icon_url": "https://mint.host/icon.jpg",
    "urls": [
      "https://mint.host",
      "http://mint8gv0sq5ul602uxt2fe0t80e3c2bi9fy0cxedp69v1vat6ruj81wv.onion"
    ],
    "time": 1725304480,
    "nuts": {
      "4": {
        "methods": [
          {
            "method": "bolt11",
            "unit": "sat",
            "min_amount": 0,
            "max_amount": 10000
          }
        ],
        "disabled": false
      },
      "5": {
        "methods": [
          {
            "method": "bolt11",
            "unit": "sat",
            "min_amount": 100,
            "max_amount": 10000
          }
        ],
        "disabled": false
      },
      "7": {
        "supported": true
      },
      "8": {
        "supported": true
      },
      "9": {
        "supported": true
      },
      "10": {
        "supported": true
      },
      "12": {
        "supported": true
      }
    }
  })
})
