import { PageTitle } from "@/components/PageTitle";
import { FormattedMessage } from "react-intl";
import { IdentityCard } from "@/pages/home/components/IdentityCard";
import { ClowderCard } from "@/pages/home/components/ClowderCard";
import { MintInfoCard } from "@/pages/home/components/MintInfoCard";

export default function HomePage() {
  return (
    <>
      <PageTitle>
        <FormattedMessage
          id="home.page.title"
          defaultMessage="Home"
        />
      </PageTitle>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          <IdentityCard />
          <ClowderCard />
          <MintInfoCard />
        </div>
      </div>
    </>
  );
}
