const INFO = "/v1/info"
const BALANCES = "/v1/balances"

const ADMIN_QUOTE_PENDING = "/v1/admin/credit/quote/pending"
const ADMIN_QUOTE_ACCEPTED = "/v1/admin/credit/quote/accepted"
const ADMIN_QUOTE_BY_ID = "/v1/admin/credit/quote/:id" // TODO: unused?

const CREDIT_QUOTE = "/v1/credit/mint/quote"
const CREDIT_QUOTES_BY_ID = "/v1/credit/mint/quote/:id"

export {
  INFO,
  BALANCES,
  ADMIN_QUOTE_PENDING,
  ADMIN_QUOTE_ACCEPTED,
  ADMIN_QUOTE_BY_ID,
  CREDIT_QUOTE,
  CREDIT_QUOTES_BY_ID,
}
