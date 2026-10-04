import { CreateRequestForm } from "@/components/requests/create-request-form";

export const metadata = { title: "Create request" };

export default function Page() {
  return <CreateRequestForm basePath="/organization" />;
}
