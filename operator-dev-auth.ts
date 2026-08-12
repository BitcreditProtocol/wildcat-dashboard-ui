import { createHash, timingSafeEqual } from "node:crypto";

const digest = (value: string): Buffer => createHash("sha256").update(value).digest();
const sessionCookieName = "bitcredit_operator_session";

function credentialsMatch(username: string, password: string, expectedToken: string | undefined): boolean {
  const token = expectedToken ?? "";
  return token.length >= 32 && timingSafeEqual(digest(username), digest("operator")) && timingSafeEqual(digest(password), digest(token));
}

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

  return credentialsMatch(username, password, expectedToken);
}

export function operatorFormAuthMatches(username: string, password: string, expectedToken: string | undefined): boolean {
  return credentialsMatch(username, password, expectedToken);
}

export function operatorSessionCookie(expectedToken: string | undefined): string | null {
  if ((expectedToken?.length ?? 0) < 32) return null;
  return `${sessionCookieName}=${digest(`operator-session:${expectedToken}`).toString("base64url")}`;
}

export function operatorSessionMatches(cookieHeader: string | undefined, expectedToken: string | undefined): boolean {
  const expected = operatorSessionCookie(expectedToken);
  if (expected === null) return false;
  return (cookieHeader ?? "")
    .split(";")
    .map((cookie) => cookie.trim())
    .some((cookie) => timingSafeEqual(digest(cookie), digest(expected)));
}

export function operatorSafeReturnTo(value: string | null): string {
  return value?.startsWith("/") === true && !value.startsWith("//") ? value : "/";
}
