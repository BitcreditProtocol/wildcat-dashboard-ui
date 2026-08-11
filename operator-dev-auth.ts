import { createHash, timingSafeEqual } from "node:crypto";

const digest = (value: string): Buffer => createHash("sha256").update(value).digest();

export function operatorBasicAuthRequiredForPath(pathname: string): boolean {
  return pathname !== "/v1/admin" && !pathname.startsWith("/v1/admin/");
}

/** HTTP Basic auth for the local operator server; both comparisons use fixed-size digests. */
export function operatorBasicAuthMatches(header: string | undefined, expectedToken: string | undefined): boolean {
  let username = "";
  let password = "";
  if (header?.startsWith("Basic ") === true) {
    const encoded = header.slice("Basic ".length);
    if (/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(encoded)) {
      const decoded = Buffer.from(encoded, "base64").toString("utf8");
      const separator = decoded.indexOf(":");
      if (separator >= 0) {
        username = decoded.slice(0, separator);
        password = decoded.slice(separator + 1);
      }
    }
  }

  const token = expectedToken ?? "";
  const usernameMatches = timingSafeEqual(digest(username), digest("operator"));
  const passwordMatches = timingSafeEqual(digest(password), digest(token));
  return token.length >= 32 && usernameMatches && passwordMatches;
}
