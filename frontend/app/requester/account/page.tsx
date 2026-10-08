import { AccountDataCard } from "@/components/account/account-data-card";
import { PageHeader } from "@/components/shell/page-header";

export const metadata = { title: "Dữ liệu của tôi" };

export default function Page() {
  return (
    <>
      <PageHeader title="Dữ liệu của tôi" description="Bạn toàn quyền kiểm soát thông tin cá nhân của mình." />
      <div className="max-w-2xl"><AccountDataCard /></div>
    </>
  );
}
