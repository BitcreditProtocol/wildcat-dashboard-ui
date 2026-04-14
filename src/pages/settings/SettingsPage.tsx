import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageTitle } from "@/components/PageTitle";
import { ThemeSelector } from "@/components/ThemeSelector";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import { useIntl } from "react-intl";

function Loader() {
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <Skeleton className="h-12 rounded-lg" />
    </div>
  );
}

function PageBody() {
  const intl = useIntl();

  return (
    <div className="my-2 max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>
            {intl.formatMessage({
              id: "settings.theme.title",
              defaultMessage: "Appearance",
            })}
          </CardTitle>
          <CardDescription>
            {intl.formatMessage({
              id: "settings.theme.description",
              defaultMessage: "Choose how the dashboard should look on this device.",
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSelector className="flex flex-col gap-2" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <>
      <Breadcrumbs>Settings</Breadcrumbs>
      <PageTitle>Settings</PageTitle>

      <Suspense fallback={<Loader />}>
        <PageBody />
      </Suspense>
    </>
  );
}
