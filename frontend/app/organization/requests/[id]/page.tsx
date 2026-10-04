import { RequestDetailView } from "@/components/requests/request-detail-view";

export const metadata = { title: "Request" };

export default function Page() {
  return <RequestDetailView basePath="/organization" />;
}
