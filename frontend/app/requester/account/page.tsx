import { AccountDataCard } from "@/components/account/account-data-card";
import { AvatarEditor } from "@/components/shell/avatar";
import { PageHeader } from "@/components/shell/page-header";

export const metadata = { title: "Dữ liệu của tôi" };

export default function Page() {
  return (
    <>
      <PageHeader title="Dữ liệu của tôi" description="Bạn toàn quyền kiểm soát thông tin cá nhân của mình." />
      <div className="mb-5 max-w-2xl rounded-2xl border border-border bg-card p-5"><AvatarEditor /></div>
      <div className="max-w-2xl"><AccountDataCard /></div>
    </>
  );
}
