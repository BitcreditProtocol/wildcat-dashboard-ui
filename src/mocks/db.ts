import { factory, nullable, primaryKey } from "@mswjs/data"

export const db = factory({
  info: {
    id: primaryKey(String),
    name: nullable(String),
    pubkey: nullable(String),
    version: nullable(String),
  },
  quotes: {
    id: primaryKey(String),
    bill: nullable(String),
    endorser: nullable(String),
    status: nullable(String),
    submitted: nullable(String), // pending
    suggested_expiration: nullable(String), // pending
    ttl: nullable(String), // offered
    signatures: Array<string>, // accepted
    tstamp: nullable(String) // rejected
  }
})

db.info.create({
  id: "0283bf290884eed3a7ca2663fc0260de2e2064d6b355ea13f98dec004b7a7ead99",
  name: "Bob's Wildcat mint",
  pubkey: "0283bf290884eed3a7ca2663fc0260de2e2064d6b355ea13f98dec004b7a7ead99",
  version: "Nutshell/0.15.0",
})

db.quotes.create({
  id: "63777d15-ce53-4cca-94bf-7726c7930aab",
  status: "pending",
})

db.quotes.create({
  id: "cd3fc93c-4507-4154-b51b-215b6f360a53",
  status: "pending",
})

db.quotes.create({
  id: "d20ab61f-03c5-479f-930b-b6aca608b1e6",
  status: "pending",
})

db.quotes.create({
  id: "57330ad9-30b1-45a7-b900-a37be37005d3",
  status: "offered",
})

db.quotes.create({
  id: "62ea00be-66f2-4b04-b2c4-257d7409ce9f",
  status: "offered",
})

db.quotes.create({
  id: "825e4fa8-dab3-4072-bb76-d58a975154af",
  status: "accepted",
})

db.quotes.create({
  id: "0e96e7cc-4327-41c6-87bf-8096fd880117",
  status: "accepted",
})

db.quotes.create({
  id: "38b835a4-dc5d-4433-8592-81c49c94d505",
  status: "rejected",
})
db.quotes.create({
  id: "2f5bc589-9bca-4899-adbf-76c881a4e418",
  status: "rejected",
})
