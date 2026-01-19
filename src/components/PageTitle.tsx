import { PropsWithChildren } from "react"
import { H1 } from "./Headings"

export function PageTitle({ children }: PropsWithChildren<unknown>) {
  return <H1>{children}</H1>
}
