import { factory, manyOf, nullable, oneOf, primaryKey } from "@mswjs/data"
import { faker } from "@faker-js/faker"

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
    bill: oneOf("bill"),
    status: nullable(String),
    submitted: nullable(String), // pending
    suggested_expiration: nullable(String), // pending
    ttl: nullable(String), // offered
    signatures: Array<string>, // accepted
    tstamp: nullable(String), // rejected
  },
  bill: {
    id: primaryKey(String),
    drawee: nullable(oneOf("identity_public_data")),
    drawer: nullable(oneOf("identity_public_data")),
    endorsees: nullable(manyOf("identity_public_data")),
    payee: nullable(oneOf("identity_public_data")),
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

const MINT_INFO = db.info.create({
  id: "0283bf290884eed3a7ca2663fc0260de2e2064d6b355ea13f98dec004b7a7ead99",
  name: "Bob's Wildcat mint",
  pubkey: "0283bf290884eed3a7ca2663fc0260de2e2064d6b355ea13f98dec004b7a7ead99",
  version: "Nutshell/0.15.0",
})

const MINT = db.identity_public_data.create({
  node_id: MINT_INFO.id,
  name: MINT_INFO.name ?? undefined,
  email: faker.internet.exampleEmail({ firstName: MINT_INFO.name ?? undefined }),
  type: "Company",
  address: faker.location.streetAddress(),
  city: faker.location.city(),
  country: faker.location.country(),
  zip: faker.location.zipCode(),
})

const ALICE = db.identity_public_data.create({
  node_id: "02544d32dee119cd518cec548abeb2e8c3bcc8bd2dd5b9f1200794746d2cf8d8da",
  name: "Alice",
  email: faker.internet.exampleEmail({ firstName: "Alice" }),
  type: "Person",
  address: faker.location.streetAddress(),
  city: faker.location.city(),
  country: faker.location.country(),
  zip: faker.location.zipCode(),
})

const BOB = db.identity_public_data.create({
  node_id: "03ebc85dd13b60a850a3274b367acd25a8c12e7c348428a1981212a5d556a746de",
  name: "Bob",
  email: faker.internet.exampleEmail({ firstName: "Bob" }),
  type: "Person",
  address: faker.location.streetAddress(),
  city: faker.location.city(),
  country: faker.location.country(),
  zip: faker.location.zipCode(),
})

const CHARLIE = db.identity_public_data.create({
  node_id: "035547a7c0c8638b2fe708eefa3fe6b51612d926ac209e009f49da37b25d558a36",
  name: `Charlie's ${faker.company.name()}`,
  email: faker.internet.exampleEmail({ firstName: "Charlie" }),
  type: "Company",
  address: faker.location.streetAddress(),
  city: faker.location.city(),
  country: faker.location.country(),
  zip: faker.location.zipCode(),
})

const AMOUNT_OF_BILLS = 100
const BILLS = Array.from(Array(AMOUNT_OF_BILLS).keys()).map((_, index) =>
  db.bill.create({
    id: faker.string.uuid(),
    sum: faker.number.int({ min: 21, max: 21 * 1_000 }),
    maturity_date: (faker.datatype.boolean()
      ? faker.date.between({ from: Date.now(), to: Date.now() + (index + 1) * 1_000_000 })
      : faker.date.future({ years: 3, refDate: Date.now() })
    ).toUTCString(),
    drawee: ALICE,
    drawer: BOB,
    payee: ALICE, // payee: CHARLIE
    endorsees: [CHARLIE],
  }),
)

db.bill.update({
  where: { id: { equals: BILLS[0].id } },
  data: {
    ...BILLS[0],
    // set a maturiy date in the past (just for testing)
    maturity_date: faker.date.between({ from: Date.now() - 1_000_000, to: Date.now() }).toUTCString(),
  },
})

const PENDING_BILLS = BILLS.slice(0, 5)
PENDING_BILLS.forEach((bill) =>
  db.quotes.create({
    id: faker.string.uuid(),
    status: "pending",
    bill,
  }),
)

const OFFERED_BILLS = BILLS.slice(5, 10)
OFFERED_BILLS.forEach((bill) =>
  db.quotes.create({
    id: faker.string.uuid(),
    status: "offered",
    bill,
  }),
)

const REJECTED_BILLS = BILLS.slice(10, 15)
REJECTED_BILLS.forEach((bill) =>
  db.quotes.create({
    id: faker.string.uuid(),
    status: "rejected",
    bill,
  }),
)

const ACCEPTED_BILLS = BILLS.slice(15, 30)
ACCEPTED_BILLS.forEach((bill) => {
  return db.bill.update({
    where: { id: { equals: bill.id } },
    data: {
      ...bill,
      endorsees: [MINT],
      payee: MINT
    },
  })
})

ACCEPTED_BILLS.forEach((bill) => {
  db.quotes.create({
    id: faker.string.uuid(),
    status: "accepted",
    bill,
  })
})
