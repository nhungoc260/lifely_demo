import { AccountDataCard } from "@/components/account/account-data-card";
import { PageHeader } from "@/components/shell/page-header";

export const metadata = { title: "My data" };

export default function Page() {
  return (
    <>
      <PageHeader title="My data" description="You are in control of your personal information." />
      <div className="max-w-2xl"><AccountDataCard /></div>
    </>
  );
}
