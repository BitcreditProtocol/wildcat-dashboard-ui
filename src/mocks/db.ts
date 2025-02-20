import { factory, nullable, primaryKey } from "@mswjs/data";

export const db = factory({
  info: {
    id: primaryKey(String),
    name: nullable(String),
    pubkey: nullable(String),
    version: nullable(String),
  },
})

db.info.create({
  "name": "Bob's Wildcat mint",
  "pubkey": "0283bf290884eed3a7ca2663fc0260de2e2064d6b355ea13f98dec004b7a7ead99",
  "version": "Nutshell/0.15.0",
})
