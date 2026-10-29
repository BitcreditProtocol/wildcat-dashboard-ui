import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MintMarkdown } from "./MintMarkdown";

describe("Mint Markdown", () => {
  it("renders credit figures, lists, inline gate identifiers and bill tables as semantic markup", () => {
    const html = renderToStaticMarkup(
      <MintMarkdown
        text={
          "**12,000,000 sat** matures soon.\n\n- Review `finance_lock_held_elsewhere`\n\n| Buyer | Amount |\n| --- | ---: |\n| Finca | **10 sat** |"
        }
      />
    );
    expect(html).toContain("<strong");
    expect(html).toContain("<ul");
    expect(html).toContain("<code");
    expect(html).toContain("<table");
    expect(html).toContain('scope="col"');
    expect(html).toContain("finance_lock_held_elsewhere");
  });
  it("never executes model HTML or creates images or external links, including Markdown URLs", () => {
    const html = renderToStaticMarkup(
      <MintMarkdown
        text={
          '<script>alert(1)</script>\n\n<img src="https://evil.test/a" onerror="alert(1)">\n\n![image](https://evil.test/a) [link](javascript:alert(1)) **<iframe src="https://evil.test">**'
        }
      />
    );
    expect(html).not.toMatch(/<(script|img|iframe|a)\b/iu);
    expect(html).not.toContain("href=");
    expect(html).toContain("&lt;script&gt;");
  });
});
