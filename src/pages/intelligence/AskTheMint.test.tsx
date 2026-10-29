import { act } from "react";
import { fireEvent, getByRole, getByLabelText, queryByRole } from "@testing-library/dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IntlProvider } from "react-intl";
import { AskTheMint } from "./AskTheMint";
import { parseMintChat, citationLocation, type MintChat } from "./mint-discussion-api";
import { modelLabel, preferredModel } from "./chat/model-label";
import { operatorSpanish } from "@/i18n/operator-es";
import { cleanup, flush, json, renderWithProviders, requestBody, routeFetch } from "@/pages/mint-checks/mint-check-test-render";
import { intelligenceFixture } from "@/pages/mint-checks/mint-check-test-fixtures";
vi.mock("@/lib/api-client", () => ({ authenticatedFetch: (path: string, init?: RequestInit) => fetch(path, init) }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const empty = (): MintChat => ({ schema: "mint-discussion-v1", records: [], limits: { daily: 20, usedToday: 0 } });
function type(page: HTMLElement, text: string) {
  act(() => {
    fireEvent.input(getByLabelText(page, "Your question to the Mint"), { target: { value: text } });
  });
}
describe("Ask the Mint", () => {
  it("shows examples, a real pending state, cited answers and follow-ups through a mocked operator route", async () => {
    let state = empty();
    let release: ((r: Response) => void) | undefined;
    let submitted: unknown;
    vi.stubGlobal(
      "fetch",
      routeFetch({
        "/api/ai-credit/mint-intelligence": () => json(intelligenceFixture()),
        "/api/ai-credit/mint-discussion": (init) => {
          if (init?.method !== "POST") return json(state);
          submitted = requestBody(init);
          return new Promise<Response>((resolve) => {
            release = resolve;
          });
        },
      })
    );
    const { page } = await renderWithProviders(<AskTheMint />);
    expect(page.textContent).toContain("Which bills mature in the next 30 days?");
    type(page, "¿Qué vence este mes?");
    act(() => {
      fireEvent.click(getByRole(page, "button", { name: "Ask" }));
    });
    await flush();
    expect(page.textContent).toContain("Reading the Mint’s records");
    expect(page.textContent).toContain("0s elapsed");
    expect(getByRole<HTMLButtonElement>(page, "button", { name: "Ask" }).disabled).toBe(true);
    const request = submitted as { requestId: string; threadId: string; question: string };
    expect(Object.keys(request).sort()).toEqual(["question", "requestId", "threadId"]);
    state = {
      ...empty(),
      limits: { daily: 20, usedToday: 1 },
      records: [
        {
          ...request,
          status: "answered",
          requestedAt: "2026-10-28T10:00:00.000Z",
          answer: {
            answer: "Una letra vence en noviembre.",
            citations: [
              { kind: "portfolio", ref: "quote-a" },
              { kind: "policy", ref: "policy-v13", label: "Policy · policy-v13" },
              { kind: "general-knowledge" },
            ],
            followUps: ["¿Quién paga?", "¿Cuánta exposición tenemos?"],
          },
        },
      ],
    };
    act(() => {
      release?.(json(state));
    });
    await flush();
    expect(page.textContent).toContain("Una letra vence en noviembre.");
    expect(page.textContent).toContain("General knowledge — not from this Mint’s records");
    expect(getByRole(page, "link", { name: /Portfolio \/ quote/ }).getAttribute("href")).toBe("/quotes/quote-a");
    expect(getByRole(page, "link", { name: /Policy · policy-v13/ }).getAttribute("href")).toBe("/policy#policy-policy-v13");
    act(() => {
      fireEvent.click(getByRole(page, "button", { name: "¿Quién paga?" }));
    });
    expect(getByLabelText<HTMLTextAreaElement>(page, "Your question to the Mint").value).toBe("¿Quién paga?");
    expect(page.textContent).toContain("1 / 20 questions today");
  });
  it("uses Spanish UI copy and the same retry ID after an unknown transport result", async () => {
    const ids: string[] = [];
    vi.stubGlobal(
      "fetch",
      routeFetch({
        "/api/ai-credit/mint-intelligence": () => json(intelligenceFixture()),
        "/api/ai-credit/mint-discussion": (init) => {
          if (init?.method !== "POST") return json(empty());
          const body = requestBody(init) as { requestId: string };
          ids.push(body.requestId);
          return json({ code: "busy" }, 503);
        },
      })
    );
    const { page } = await renderWithProviders(
      <IntlProvider locale="es" messages={operatorSpanish}>
        <AskTheMint />
      </IntlProvider>
    );
    expect(page.textContent).toContain("¿Qué letras vencen en los próximos 30 días?");
    act(() => {
      fireEvent.input(getByLabelText(page, "Tu pregunta al Mint"), { target: { value: "¿Cuánta exposición tenemos?" } });
    });
    act(() => {
      fireEvent.click(getByRole(page, "button", { name: "Preguntar" }));
    });
    await flush();
    expect(page.textContent).toContain("Hay otra consulta al modelo");
    act(() => {
      fireEvent.click(getByRole(page, "button", { name: "Reintentar la misma pregunta" }));
    });
    await flush();
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe(ids[1]);
  });
  it("degrades when the route is absent and keeps notes and input visible", async () => {
    vi.stubGlobal("fetch", routeFetch({ "/api/ai-credit/mint-intelligence": () => json(intelligenceFixture()) }));
    const { page } = await renderWithProviders(<AskTheMint />);
    expect(page.textContent).toContain("unavailable on this API");
    expect(queryByRole(page, "textbox")).not.toBeNull();
    expect(getByRole<HTMLButtonElement>(page, "button", { name: "Ask" }).disabled).toBe(true);
  });
  it("offers only the Mint's models, sends the remembered choice, and names the model that answered", async () => {
    window.localStorage.setItem("ask-the-mint.model", "gpt-6.1-sol");
    let submitted: unknown;
    const state: MintChat = {
      ...empty(),
      models: { default: "gpt-5.6-luna", options: ["gpt-5.6-luna", "gpt-6.1-sol"] },
      records: [
        {
          requestId: "11111111-1111-4111-8111-111111111111",
          threadId: "22222222-2222-4222-8222-222222222222",
          question: "¿Qué vence?",
          status: "answered",
          requestedAt: "2026-10-28T10:00:00.000Z",
          answer: { answer: "Nada este mes.", citations: [], followUps: [] },
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      routeFetch({
        "/api/ai-credit/mint-intelligence": () => json(intelligenceFixture()),
        "/api/ai-credit/mint-discussion": (init) => {
          if (init?.method !== "POST")
            return json({ ...state, records: state.records.map((r) => ({ ...r, modelRoute: "codex-cli@0.147.0:gpt-6-sol:high:fast:x" })) });
          submitted = requestBody(init);
          return new Promise<Response>(() => undefined);
        },
      })
    );
    const { page } = await renderWithProviders(<AskTheMint />);
    expect(page.textContent).toContain("GPT-6 Sol");
    expect(getByRole(page, "button", { name: "Model: GPT-6.1 Sol" })).toBeDefined();
    type(page, "¿Y el próximo?");
    act(() => {
      fireEvent.click(getByRole(page, "button", { name: "Ask" }));
    });
    await flush();
    expect((submitted as { model?: string }).model).toBe("gpt-6.1-sol");
    window.localStorage.removeItem("ask-the-mint.model");
  });
  it("labels models plainly, ignores a remembered model the Mint no longer offers, and rejects an unoffered default", () => {
    expect(modelLabel("gpt-5.6-luna")).toBe("GPT-5.6 Luna");
    expect(modelLabel("claude-sonnet-5-5")).toBe("Claude Sonnet 5.5");
    expect(modelLabel("eins/claude-opus-5")).toBe("Claude Opus 5");
    window.localStorage.setItem("ask-the-mint.model", "retired-model");
    expect(preferredModel({ default: "gpt-5.6-luna", options: ["gpt-5.6-luna"] })).toBe("gpt-5.6-luna");
    window.localStorage.removeItem("ask-the-mint.model");
    expect(() => parseMintChat({ ...empty(), models: { default: "gpt-6.1-sol", options: ["gpt-5.6-luna"] } })).toThrow(/not offered/);
  });
  it("rejects foreign source kinds and maps only fixed application routes", () => {
    expect(() =>
      parseMintChat({
        schema: "mint-discussion-v1",
        limits: { daily: 20, usedToday: 1 },
        records: [
          {
            requestId: "r",
            threadId: "t",
            question: "q",
            status: "answered",
            requestedAt: "now",
            answer: { answer: "a", followUps: [], citations: [{ kind: "https://bad.test" }] },
          },
        ],
      })
    ).toThrow();
    expect(citationLocation({ kind: "intelligence-note", ref: "../../bad" })).toBe("/intelligence#note-..%2F..%2Fbad");
    expect(citationLocation({ kind: "general-knowledge" })).toBeNull();
  });
});
