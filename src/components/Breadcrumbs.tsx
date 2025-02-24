import { PropsWithChildren } from "react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Link } from "react-router"

export function Breadcrumbs({ parents, children }: PropsWithChildren<{ parents?: React.ReactNode[] }>) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/">Home</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        {parents && (
          <>
            {parents.map((it, index) => (
              <>
                <BreadcrumbItem key={index}>
                  <BreadcrumbLink asChild>
                    <Link to="/">{it}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            ))}
          </>
        )}
        <BreadcrumbItem>
          <BreadcrumbPage>{children}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
