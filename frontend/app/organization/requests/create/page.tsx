import { CreateRequestForm } from "@/components/requests/create-request-form";

export const metadata = { title: "Tạo yêu cầu" };

export default function Page() {
  return <CreateRequestForm basePath="/organization" />;
}
