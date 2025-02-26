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
              <div className="flex items-center gap-2" key={index}>
                <BreadcrumbItem>
                  <>{it}</>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </div>
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
