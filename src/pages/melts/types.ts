export type MeltRequestsSortField = "id" | "amount" | "created";
export type MeltRequestsSortDirection = "asc" | "desc";
export type MeltRequestsSortBy = `${MeltRequestsSortField}-${MeltRequestsSortDirection}`;
export type MeltRequestsFilter = "all" | "today" | "last-7-days";
