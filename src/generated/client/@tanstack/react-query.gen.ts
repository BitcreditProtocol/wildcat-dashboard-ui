// This file is auto-generated by @hey-api/openapi-ts

import { type Options, adminLookupQuote, resolveQuote, listAcceptedQuotes, listPendingQuotes, resolveOffer, enquireQuote, lookupQuote } from '../sdk.gen';
import { queryOptions, type UseMutationOptions, type DefaultError } from '@tanstack/react-query';
import type { AdminLookupQuoteData, ResolveQuoteData, ListAcceptedQuotesData, ListPendingQuotesData, ResolveOfferData, EnquireQuoteData, EnquireQuoteResponse, LookupQuoteData } from '../types.gen';
import { client as _heyApiClient } from '../client.gen';

export type QueryKey<TOptions extends Options> = [
    Pick<TOptions, 'baseUrl' | 'body' | 'headers' | 'path' | 'query'> & {
        _id: string;
        _infinite?: boolean;
    }
];

const createQueryKey = <TOptions extends Options>(id: string, options?: TOptions, infinite?: boolean): [
    QueryKey<TOptions>[0]
] => {
    const params: QueryKey<TOptions>[0] = { _id: id, baseUrl: (options?.client ?? _heyApiClient).getConfig().baseUrl } as QueryKey<TOptions>[0];
    if (infinite) {
        params._infinite = infinite;
    }
    if (options?.body) {
        params.body = options.body;
    }
    if (options?.headers) {
        params.headers = options.headers;
    }
    if (options?.path) {
        params.path = options.path;
    }
    if (options?.query) {
        params.query = options.query;
    }
    return [
        params
    ];
};

export const adminLookupQuoteQueryKey = (options: Options<AdminLookupQuoteData>) => createQueryKey('adminLookupQuote', options);

export const adminLookupQuoteOptions = (options: Options<AdminLookupQuoteData>) => {
    return queryOptions({
        queryFn: async ({ queryKey, signal }) => {
            const { data } = await adminLookupQuote({
                ...options,
                ...queryKey[0],
                signal,
                throwOnError: true
            });
            return data;
        },
        queryKey: adminLookupQuoteQueryKey(options)
    });
};

export const resolveQuoteQueryKey = (options: Options<ResolveQuoteData>) => createQueryKey('resolveQuote', options);

export const resolveQuoteOptions = (options: Options<ResolveQuoteData>) => {
    return queryOptions({
        queryFn: async ({ queryKey, signal }) => {
            const { data } = await resolveQuote({
                ...options,
                ...queryKey[0],
                signal,
                throwOnError: true
            });
            return data;
        },
        queryKey: resolveQuoteQueryKey(options)
    });
};

export const resolveQuoteMutation = (options?: Partial<Options<ResolveQuoteData>>) => {
    const mutationOptions: UseMutationOptions<unknown, DefaultError, Options<ResolveQuoteData>> = {
        mutationFn: async (localOptions) => {
            const { data } = await resolveQuote({
                ...options,
                ...localOptions,
                throwOnError: true
            });
            return data;
        }
    };
    return mutationOptions;
};

export const listAcceptedQuotesQueryKey = (options?: Options<ListAcceptedQuotesData>) => createQueryKey('listAcceptedQuotes', options);

export const listAcceptedQuotesOptions = (options?: Options<ListAcceptedQuotesData>) => {
    return queryOptions({
        queryFn: async ({ queryKey, signal }) => {
            const { data } = await listAcceptedQuotes({
                ...options,
                ...queryKey[0],
                signal,
                throwOnError: true
            });
            return data;
        },
        queryKey: listAcceptedQuotesQueryKey(options)
    });
};

export const listPendingQuotesQueryKey = (options?: Options<ListPendingQuotesData>) => createQueryKey('listPendingQuotes', options);

export const listPendingQuotesOptions = (options?: Options<ListPendingQuotesData>) => {
    return queryOptions({
        queryFn: async ({ queryKey, signal }) => {
            const { data } = await listPendingQuotes({
                ...options,
                ...queryKey[0],
                signal,
                throwOnError: true
            });
            return data;
        },
        queryKey: listPendingQuotesQueryKey(options)
    });
};

export const resolveOfferQueryKey = (options: Options<ResolveOfferData>) => createQueryKey('resolveOffer', options);

export const resolveOfferOptions = (options: Options<ResolveOfferData>) => {
    return queryOptions({
        queryFn: async ({ queryKey, signal }) => {
            const { data } = await resolveOffer({
                ...options,
                ...queryKey[0],
                signal,
                throwOnError: true
            });
            return data;
        },
        queryKey: resolveOfferQueryKey(options)
    });
};

export const resolveOfferMutation = (options?: Partial<Options<ResolveOfferData>>) => {
    const mutationOptions: UseMutationOptions<unknown, DefaultError, Options<ResolveOfferData>> = {
        mutationFn: async (localOptions) => {
            const { data } = await resolveOffer({
                ...options,
                ...localOptions,
                throwOnError: true
            });
            return data;
        }
    };
    return mutationOptions;
};

export const enquireQuoteQueryKey = (options: Options<EnquireQuoteData>) => createQueryKey('enquireQuote', options);

export const enquireQuoteOptions = (options: Options<EnquireQuoteData>) => {
    return queryOptions({
        queryFn: async ({ queryKey, signal }) => {
            const { data } = await enquireQuote({
                ...options,
                ...queryKey[0],
                signal,
                throwOnError: true
            });
            return data;
        },
        queryKey: enquireQuoteQueryKey(options)
    });
};

export const enquireQuoteMutation = (options?: Partial<Options<EnquireQuoteData>>) => {
    const mutationOptions: UseMutationOptions<EnquireQuoteResponse, DefaultError, Options<EnquireQuoteData>> = {
        mutationFn: async (localOptions) => {
            const { data } = await enquireQuote({
                ...options,
                ...localOptions,
                throwOnError: true
            });
            return data;
        }
    };
    return mutationOptions;
};

export const lookupQuoteQueryKey = (options: Options<LookupQuoteData>) => createQueryKey('lookupQuote', options);

export const lookupQuoteOptions = (options: Options<LookupQuoteData>) => {
    return queryOptions({
        queryFn: async ({ queryKey, signal }) => {
            const { data } = await lookupQuote({
                ...options,
                ...queryKey[0],
                signal,
                throwOnError: true
            });
            return data;
        },
        queryKey: lookupQuoteQueryKey(options)
    });
};