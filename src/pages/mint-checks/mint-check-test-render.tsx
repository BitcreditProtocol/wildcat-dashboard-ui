import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { MemoryRouter } from "react-router";
import { RouteLocation } from "./MintCheckTestRoute";

let root: Root | undefined;
let mount: HTMLDivElement | undefined;

export async function flush() {
  for (let index = 0; index < 6; index += 1)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
}

/** Renders with a fresh query client, English messages and a memory router; `cleanup` unmounts it. */
export async function renderWithProviders(element: ReactNode, initialEntry = "/") {
  mount = document.createElement("div");
  document.body.appendChild(mount);
  root = createRoot(mount);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  act(() => {
    root?.render(
      <QueryClientProvider client={client}>
        <IntlProvider locale="en" timeZone="UTC">
          <MemoryRouter initialEntries={[initialEntry]}>
            {element}
            <RouteLocation />
          </MemoryRouter>
        </IntlProvider>
      </QueryClientProvider>
    );
  });
  await flush();
  return { page: mount, client };
}

export function cleanup() {
  act(() => root?.unmount());
  mount?.remove();
  root = undefined;
  mount = undefined;
}

/** A fetch stub answering by path; unknown paths fail with 404 so a stray request is visible. */
export function routeFetch(routes: Record<string, (init?: RequestInit) => Response | Promise<Response>>) {
  return (path: string, init?: RequestInit) => {
    const route = routes[path];
    return Promise.resolve(route ? route(init) : new Response(null, { status: 404 }));
  };
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export function requestBody(init?: RequestInit): unknown {
  return typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
}
