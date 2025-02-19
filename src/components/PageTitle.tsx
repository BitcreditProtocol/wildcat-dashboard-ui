import { PropsWithChildren } from "react";
import { H2 } from "./H2";

export function PageTitle({ children }: PropsWithChildren<unknown>) {
  return (
    <H2>
      {children}
    </H2>
  )
}
