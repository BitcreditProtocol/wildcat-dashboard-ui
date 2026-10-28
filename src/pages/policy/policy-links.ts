export const policyAnchor = (version: string, rule?: string) =>
  `policy-${encodeURIComponent(version)}${rule ? `--${encodeURIComponent(rule)}` : ""}`;
export const policyLocation = (version: string, rule?: string) => `/policy#${policyAnchor(version, rule)}`;
