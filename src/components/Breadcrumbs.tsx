import { PropsWithChildren } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from "react-router";
import { useIntl } from "react-intl";

export function Breadcrumbs({
  parents,
  children,
}: PropsWithChildren<{ parents?: React.ReactNode[] }>) {
  const intl = useIntl();

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/">
              {intl.formatMessage({
                id: "nav.home",
                defaultMessage: "Home",
              })}
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        {parents && (
          <>
            {parents.map((it, index) => (
              <div
                className="flex items-center gap-2"
                key={index}
              >
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
  );
}
