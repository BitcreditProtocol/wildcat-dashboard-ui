import { factory, nullable, oneOf, primaryKey } from "@mswjs/data"

export const db = factory({
  info: {
    id: primaryKey(String),
    name: nullable(String),
    pubkey: nullable(String),
    version: nullable(String),
  },
  quotes: {
    id: primaryKey(String),
    bill: {
      id: nullable(String),
      drawee: nullable(oneOf('identity_public_data')),
      drawer: nullable(oneOf('identity_public_data')),
      holder: nullable(oneOf('identity_public_data')),
      payee: nullable(oneOf('identity_public_data')),
      sum: Number,
      maturity_date: String,
    },
    status: nullable(String),
    submitted: nullable(String), // pending
    suggested_expiration: nullable(String), // pending
    ttl: nullable(String), // offered
    signatures: Array<string>, // accepted
    tstamp: nullable(String), // rejected
  },
  identity_public_data: {
    node_id: primaryKey(String),
    name: String,
    email: nullable(String),
    nostr_relay: nullable(String),
    type: String,
    address: String,
    city: String,
    country: String,
    zip: nullable(String),
  },

})

const ALICE = db.identity_public_data.create({
  node_id: "02544d32dee119cd518cec548abeb2e8c3bcc8bd2dd5b9f1200794746d2cf8d8da",
  name: "Alice",
  type: "Person",
  address: "Street 1",
  city: "London",
  country: "UK",
})

const BOB = db.identity_public_data.create({
  node_id: "03ebc85dd13b60a850a3274b367acd25a8c12e7c348428a1981212a5d556a746de",
  name: "Bob",
  type: "Person",
  address: "Street 2",
  city: "London",
  country: "UK",
})

const CHARLIE = db.identity_public_data.create({
  node_id: "035547a7c0c8638b2fe708eefa3fe6b51612d926ac209e009f49da37b25d558a36",
  name: "Charlie",
  type: "Person",
  address: "Street 3",
  city: "London",
  country: "UK",
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
  bill: {
    id: "5bd3f9b8-85bd-488e-a7ca-2b35bd343e7c",
    sum: 42,
    maturity_date: "2025-01-01",
    drawee: ALICE,
    drawer: BOB,
    payee: ALICE,
    holder: CHARLIE
  },
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
