import "@testing-library/jest-dom/vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const localStorageCandidate = (globalThis as unknown as { localStorage?: unknown }).localStorage;
const hasValidLocalStorage =
  typeof localStorageCandidate === "object" &&
  localStorageCandidate !== null &&
  typeof (localStorageCandidate as { getItem?: unknown }).getItem === "function" &&
  typeof (localStorageCandidate as { setItem?: unknown }).setItem === "function" &&
  typeof (localStorageCandidate as { removeItem?: unknown }).removeItem === "function" &&
  typeof (localStorageCandidate as { clear?: unknown }).clear === "function";

if (!hasValidLocalStorage) {
  const storage = new Map<string, string>();
  const localStorageMock = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    },
  };

  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageMock,
    configurable: true,
  });
}

if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      addListener: () => {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      removeListener: () => {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      addEventListener: () => {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

const elementPrototype = HTMLElement.prototype as unknown as Record<string, unknown>;

if (!("setPointerCapture" in elementPrototype)) {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  elementPrototype.setPointerCapture = () => {};
}

if (!("releasePointerCapture" in elementPrototype)) {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  elementPrototype.releasePointerCapture = () => {};
}

if (!("ResizeObserver" in globalThis)) {
  class ResizeObserverMock {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    observe() {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    unobserve() {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver = ResizeObserverMock;
}

const normalizeStorage = () => {
  const isValidStorage = (storage: unknown): storage is Pick<Storage, "getItem" | "setItem" | "removeItem" | "clear"> =>
    !!storage &&
    typeof (storage as Storage).getItem === "function" &&
    typeof (storage as Storage).setItem === "function" &&
    typeof (storage as Storage).removeItem === "function" &&
    typeof (storage as Storage).clear === "function";

  if (isValidStorage(globalThis.localStorage)) {
    return;
  }

  const map = new Map<string, string>();
  const storageMock = {
    get length() {
      return map.size;
    },
    clear: () => {
      map.clear();
    },
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    removeItem: (key: string) => {
      map.delete(key);
    },
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  } satisfies Storage;

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storageMock,
  });
};

normalizeStorage();

const originalGetComputedStyle = window.getComputedStyle;
window.getComputedStyle = (elt: Element, pseudoElt?: string | null) => {
  const style = originalGetComputedStyle(elt, pseudoElt);
  if (!style.transform) {
    (style as unknown as { transform: string }).transform = "matrix(1, 0, 0, 1, 0, 0)";
  }
  return style;
};
