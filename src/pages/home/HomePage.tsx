import { Heading } from "@bitcredit/ui-library";
import { FormattedMessage } from "react-intl";
import { IdentityCard } from "@/pages/home/components/IdentityCard";
import { ClowderPeersCard } from "@/pages/home/components/clowder-peers/ClowderPeersCard";
import { MintInfoCard } from "@/pages/home/components/MintInfoCard";

export default function HomePage() {
  return (
    <>
      <Heading as="h1" variant="page" className="mb-6 pt-4">
        <FormattedMessage id="home.page.title" defaultMessage="Home" />
      </Heading>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-4">
          <IdentityCard />
          <MintInfoCard />
        </div>
        <ClowderPeersCard />
      </div>
    </>
  );
}
