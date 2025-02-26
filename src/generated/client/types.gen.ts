// This file is auto-generated by @hey-api/openapi-ts

/**
 * Manuall added - should be replaced with generated one.
 */
export type Id = string;

/**
 * Manuall added - should be replaced with generated one.
 */
export type P2PkWitness = string;

/**
 * Manuall added - should be replaced with generated one.
 */
export type HtlcWitness = string;

/**
 * Manuall added - should be replaced with generated one.
 */
export type Resolve = string;

/**
 * Manuall added - should be replaced with generated one.
 */
export type IdentityPublicData = string;

/**
 * Amount can be any unit
 */
export type Amount = number;

/**
 * --------------------------- Enquire mint quote
 */
export type BillInfo = {
    drawee: IdentityPublicData;
    drawer: IdentityPublicData;
    holder: IdentityPublicData;
    id: string;
    maturity_date: string;
    payee: IdentityPublicData;
    sum: number;
};

/**
 * Blind Signature (also called `promise`)
 */
export type BlindSignature = {
    /**
     * Blinded signature (C_)
     *
     * The blinded signature on the secret message `B_` of [BlindedMessage].
     */
    C_: string;
    amount: Amount;
    dleq?: BlindSignatureDleq | null;
    id: Id;
};

/**
 * Blinded Signature on Dleq
 *
 * Defined in [NUT12](https://github.com/cashubtc/nuts/blob/main/12.md)
 */
export type BlindSignatureDleq = {
    /**
     * e
     */
    e: string;
    /**
     * s
     */
    s: string;
};

/**
 * Blinded Message (also called `output`)
 */
export type BlindedMessage = {
    /**
     * Blinded secret message (B_)
     *
     * The blinded secret message generated by the sender.
     */
    B_: string;
    amount: Amount;
    id: Id;
    witness?: Witness | null;
};

export type EnquireReply = {
    id: string;
};

/**
 * --------------------------- Enquire mint quote
 */
export type EnquireRequest = {
    content: BillInfo;
    outputs: Array<BlindedMessage>;
    signature: string;
};

/**
 * --------------------------- Quote info request
 */
export type InfoReply = {
    bill: BillInfo;
    id: string;
    status: 'pending';
    submitted: string;
    suggested_expiration: string;
} | {
    bill: BillInfo;
    id: string;
    signatures: Array<BlindSignature>;
    status: 'offered';
    ttl: string;
} | {
    bill: BillInfo;
    id: string;
    status: 'denied';
} | {
    bill: BillInfo;
    id: string;
    signatures: Array<BlindSignature>;
    status: 'accepted';
} | {
    bill: BillInfo;
    id: string;
    status: 'rejected';
    tstamp: string;
};

/**
 * --------------------------- List quotes
 */
export type ListReply = {
    quotes: Array<string>;
};

/**
 * --------------------------- Resolve quote
 */
export type ResolveOffer = {
    action: 'reject';
} | {
    action: 'accept';
};

/**
 * --------------------------- Resolve quote request
 */
export type ResolveRequest = {
    action: 'deny';
} | {
    action: 'offer';
    discount: string;
    ttl?: string | null;
};

/**
 * --------------------------- Look up quote
 */
export type StatusReply = {
    status: 'pending';
} | {
    status: 'denied';
} | {
    expiration_date: string;
    signatures: Array<BlindSignature>;
    status: 'offered';
} | {
    signatures: Array<BlindSignature>;
    status: 'accepted';
} | {
    status: 'rejected';
    tstamp: string;
};

/**
 * Witness
 */
export type Witness = P2PkWitness | HtlcWitness;

export type AdminLookupQuoteData = {
    body?: never;
    path: {
        /**
         * The quote id
         */
        id: string;
    };
    query?: never;
    url: '/v1/admin/credit/quote/{id}';
};

export type AdminLookupQuoteErrors = {
    /**
     * Quote id not  found
     */
    404: unknown;
};

export type AdminLookupQuoteResponses = {
    /**
     * Succesful response
     */
    200: InfoReply;
};

export type AdminLookupQuoteResponse = AdminLookupQuoteResponses[keyof AdminLookupQuoteResponses];

export type ResolveQuoteData = {
    body: ResolveRequest;
    path: {
        /**
         * The quote id
         */
        id: string;
    };
    query?: never;
    url: '/v1/admin/credit/quote/{id}';
};

export type ResolveQuoteResponses = {
    /**
     * Succesful response
     */
    200: unknown;
};

export type ListAcceptedQuotesData = {
    body?: never;
    path?: never;
    query?: {
        /**
         * only accepted quotes younger than `since`
         */
        since?: string | null;
    };
    url: '/v1/admin/credit/quote/accepted';
};

export type ListAcceptedQuotesResponses = {
    /**
     * Succesful response
     */
    200: ListReply;
};

export type ListAcceptedQuotesResponse = ListAcceptedQuotesResponses[keyof ListAcceptedQuotesResponses];

export type ListPendingQuotesData = {
    body?: never;
    path?: never;
    query?: {
        /**
         * only quote requests younger than `since`
         */
        since?: string | null;
    };
    url: '/v1/admin/credit/quote/pending';
};

export type ListPendingQuotesResponses = {
    /**
     * Succesful response
     */
    200: ListReply;
};

export type ListPendingQuotesResponse = ListPendingQuotesResponses[keyof ListPendingQuotesResponses];

export type EnquireQuoteData = {
    body: EnquireRequest;
    path?: never;
    query?: never;
    url: '/v1/credit/mint/quote';
};

export type EnquireQuoteErrors = {
    /**
     * Quote request not accepted
     */
    404: unknown;
};

export type EnquireQuoteResponses = {
    /**
     * Quote request admitted
     */
    200: EnquireReply;
};

export type EnquireQuoteResponse = EnquireQuoteResponses[keyof EnquireQuoteResponses];

export type LookupQuoteData = {
    body?: never;
    path: {
        /**
         * The quote id
         */
        id: string;
    };
    query?: never;
    url: '/v1/credit/mint/quote/{id}';
};

export type LookupQuoteErrors = {
    /**
     * Quote id not  found
     */
    404: unknown;
};

export type LookupQuoteResponses = {
    /**
     * Succesful response
     */
    200: StatusReply;
};

export type LookupQuoteResponse = LookupQuoteResponses[keyof LookupQuoteResponses];

export type ResolveOfferData = {
    body: Resolve;
    path: {
        /**
         * The quote id
         */
        id: string;
    };
    query?: never;
    url: '/v1/credit/quote/{id}';
};

export type ResolveOfferErrors = {
    /**
     * Quote not found
     */
    404: unknown;
    /**
     * Quote already resolved
     */
    409: unknown;
};

export type ResolveOfferResponses = {
    /**
     * Succesful response
     */
    200: unknown;
};

export type ClientOptions = {
    baseUrl: `${string}://opt` | (string & {});
};