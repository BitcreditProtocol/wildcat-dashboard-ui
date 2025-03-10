import { factory, nullable, oneOf, primaryKey } from "@mswjs/data"
import { faker } from '@faker-js/faker'

// Seed `faker` to ensure reproducible random values of model properties.
faker.seed(21_000_000)

export const db = factory({
  info: {
    id: primaryKey(String),
    name: nullable(String),
    pubkey: nullable(String),
    version: nullable(String),
  },
  quotes: {
    id: primaryKey(String),
    bill: oneOf('bill'),
    status: nullable(String),
    submitted: nullable(String), // pending
    suggested_expiration: nullable(String), // pending
    ttl: nullable(String), // offered
    signatures: Array<string>, // accepted
    tstamp: nullable(String), // rejected
  },
  bill: {
    id: primaryKey(String),
    drawee: nullable(oneOf('identity_public_data')),
    drawer: nullable(oneOf('identity_public_data')),
    holder: nullable(oneOf('identity_public_data')),
    payee: nullable(oneOf('identity_public_data')),
    sum: Number,
    maturity_date: String,
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

db.info.create({
  id: "0283bf290884eed3a7ca2663fc0260de2e2064d6b355ea13f98dec004b7a7ead99",
  name: "Bob's Wildcat mint",
  pubkey: "0283bf290884eed3a7ca2663fc0260de2e2064d6b355ea13f98dec004b7a7ead99",
  version: "Nutshell/0.15.0",
})

const ALICE = db.identity_public_data.create({
  node_id: "02544d32dee119cd518cec548abeb2e8c3bcc8bd2dd5b9f1200794746d2cf8d8da",
  name: "Alice",
  email: faker.internet.exampleEmail({ firstName: "Alice" }),
  type: "Person",
  address: faker.location.streetAddress(),
  city: faker.location.city(),
  country: faker.location.country(),
  zip: faker.location.zipCode()
})

const BOB = db.identity_public_data.create({
  node_id: "03ebc85dd13b60a850a3274b367acd25a8c12e7c348428a1981212a5d556a746de",
  name: "Bob",
  email: faker.internet.exampleEmail({ firstName: "Bob" }),
  type: "Person",
  address: faker.location.streetAddress(),
  city: faker.location.city(),
  country: faker.location.country(),
  zip: faker.location.zipCode()
})

const CHARLIE = db.identity_public_data.create({
  node_id: "035547a7c0c8638b2fe708eefa3fe6b51612d926ac209e009f49da37b25d558a36",
  name: `Charlie's ${faker.company.name()}`,
  email: faker.internet.exampleEmail({ firstName: "Charlie" }),
  type: "Company",
  address: faker.location.streetAddress(),
  city: faker.location.city(),
  country: faker.location.country(),
  zip: faker.location.zipCode()
})

const AMOUNT_OF_BILLS = 100
const BILLS = Array.from(Array(AMOUNT_OF_BILLS).keys()).map(() => db.bill.create({
  id: faker.string.uuid(),
  sum: faker.number.int({ min: 21, max: 21 * 1_000}),
  maturity_date: faker.date.future({ years: 1 }).toUTCString(),
  drawee: ALICE,
  drawer: BOB,
  payee: ALICE,
  holder: CHARLIE
}))

const PENDING_BILLS = BILLS.slice(0, 3)
PENDING_BILLS.forEach((bill) => db.quotes.create({
  id: faker.string.uuid(),
  status: "pending",
  bill,
}))

const OFFERED_BILLS = BILLS.slice(3, 6)
OFFERED_BILLS.forEach((bill) => db.quotes.create({
  id: faker.string.uuid(),
  status: "offered",
  bill,
}))

const REJECTED_BILLS = BILLS.slice(6, 9)
REJECTED_BILLS.forEach((bill) => db.quotes.create({
  id: faker.string.uuid(),
  status: "rejected",
  bill,
}))

const ACCEPTED_BILLS = BILLS.slice(9, 32)
ACCEPTED_BILLS.forEach((bill) => {
  db.quotes.create({
    id: faker.string.uuid(),
    status: "accepted",
    bill,
  })
})
