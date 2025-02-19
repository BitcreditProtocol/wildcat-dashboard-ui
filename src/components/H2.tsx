import { PropsWithChildren } from "react";

export function H2({ children }: PropsWithChildren<unknown>) {
  return (
    <h2 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
      {children}
    </h2>
  )
}
