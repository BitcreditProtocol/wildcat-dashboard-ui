import { LabelHTMLAttributes, PropsWithChildren } from "react"
import { cn } from "@/lib/utils"

type InputContainerProps = PropsWithChildren<{
  htmlFor: LabelHTMLAttributes<HTMLLabelElement>["htmlFor"]
  label: React.ReactNode
}>

const InputContainer = ({ children, htmlFor, label }: InputContainerProps) => {
  return (
    <div
      className={cn(
        "flex gap-2 justify-between items-center font-semibold",
        "peer flex h-[58px] w-full rounded-[8px] border bg-elevation-200 px-4 text-sm transition-all duration-200 ease-in-out outline-none focus:outline-none",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:ring-0",
      )}
    >
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  )
}

export { InputContainer }
