import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { IntlProvider } from "react-intl";
import type { ConnectedMintResponse, SimpleAlphaState } from "@/generated/client/types.gen";
import { PeerDetailPanel } from "./PeerDetailPanel";

const peer: ConnectedMintResponse = {
  mint: "https://mint.example/",
  clowder: "https://clowder.example/",
  node_id: "alpha-node",
};

const substitute: ConnectedMintResponse = {
  mint: "https://substitute.example/",
  clowder: "https://substitute-clowder.example/",
  node_id: "substitute-node",
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function renderPanel(state: SimpleAlphaState): HTMLDivElement {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const mountRoot = createRoot(mount);
  act(() => {
    mountRoot.render(
      <IntlProvider locale="en">
        <PeerDetailPanel
          id="panel"
          labelledBy="tab"
          peer={peer}
          state={state}
          isLoading={false}
          isError={false}
          substitute={substitute}
          showsSubstitute
        />
      </IntlProvider>
    );
  });
  root = mountRoot;
  container = mount;
  return mount;
}

afterEach(() => {
  // React keeps timers running until the tree unmounts, and vitest tears the jsdom
  // environment down right after the last test — unmount here so nothing fires after it.
  if (root && container) {
    act(() => {
      root?.unmount();
    });
    container.remove();
    root = null;
    container = null;
  }
});

describe("PeerDetailPanel", () => {
  it("hides the substitute while the alpha is online, since nothing is standing in for it", () => {
    const page = renderPanel({ Online: 1_768_000_000 });

    expect(page.textContent).toContain("Online");
    expect(page.textContent).not.toContain("Substitute Information");
    expect(page.textContent).not.toContain("substitute.example");
  });

  it("shows the substitute while the alpha is offline", () => {
    const page = renderPanel({ Offline: 1_768_000_000 });

    expect(page.textContent).toContain("Substitute Information");
    expect(page.textContent).toContain("substitute.example");
  });

  it("shows the substitute while the alpha is recovering", () => {
    const page = renderPanel({ Interim: 1_768_000_000 });

    expect(page.textContent).toContain("Substitute Information");
    expect(page.textContent).toContain("substitute.example");
  });
});
