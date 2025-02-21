import { PropsWithChildren } from "react"

export function H2({ children }: PropsWithChildren<unknown>) {
  return <h2 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">{children}</h2>
}

export function H3({ children }: PropsWithChildren<unknown>) {
  return <h3 className="scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">{children}</h3>
}
