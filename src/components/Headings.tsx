import { PropsWithChildren } from "react";
import { Heading } from "@bitcredit/ui-library";

export function H1({ children }: PropsWithChildren<unknown>) {
  return (
    <Heading as="h1" variant="page" className="mb-6 pt-4">
      {children}
    </Heading>
  );
}

export function H2({ children }: PropsWithChildren<unknown>) {
  return (
    <Heading as="h2" variant="section" className="mb-6 pt-4">
      {children}
    </Heading>
  );
}

export function H3({ children }: PropsWithChildren<unknown>) {
  return (
    <Heading as="h3" variant="sub">
      {children}
    </Heading>
  );
}
