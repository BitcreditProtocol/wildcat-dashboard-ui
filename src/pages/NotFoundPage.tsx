import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button, Heading } from "@bitcredit/ui-library";
import { FormattedMessage } from "react-intl";
import { Link, useParams } from "react-router";

interface NotFoundPageProps {
  path?: string;
}

export default function NotFoundPage({ path }: NotFoundPageProps) {
  const { "*": splat } = useParams();
  const requestedPath = path ?? (splat ? `/${splat}` : "/");

  return (
    <>
      <Breadcrumbs>
        <FormattedMessage id="notFound.breadcrumb" defaultMessage="Page not found" />
      </Breadcrumbs>

      <div className="flex flex-col justify-center gap-4 py-10">
        <div className="flex flex-col gap-2">
          <Heading as="h1" variant="page">
            <FormattedMessage id="notFound.title" defaultMessage="Page not found" />
          </Heading>
          <p className="max-w-xl text-sm text-muted-foreground">
            <FormattedMessage
              id="notFound.description"
              defaultMessage="No page exists for {path}."
              values={{
                path: <span className="font-mono text-foreground">{requestedPath}</span>,
              }}
            />
          </p>
        </div>

        <Button asChild className="max-w-3/12">
          <Link to="/">
            <FormattedMessage id="notFound.homeButton" defaultMessage="Go home" />
          </Link>
        </Button>
      </div>
    </>
  );
}
