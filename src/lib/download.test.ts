import { afterEach, describe, expect, it, vi } from "vitest";
import { beginPdfDownload } from "./download";

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe("authenticated PDF download", () => {
  it("downloads rather than opening authenticated bytes in a dashboard tab", () => {
    let observedTarget: string | undefined;
    let observedDownload: string | undefined;
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      observedTarget = this.target;
      observedDownload = this.download;
    });
    vi.spyOn(window.URL, "createObjectURL").mockReturnValue("blob:dashboard-evidence");

    expect(beginPdfDownload(new Blob(["pdf"]), "../invoice\u0000copy")).toBe("blob:dashboard-evidence");
    expect(click).toHaveBeenCalledOnce();
    expect(observedTarget).toBe("");
    expect(observedDownload).toBe("..-invoice-copy.pdf");
    expect(document.body.childElementCount).toBe(0);
  });
});
