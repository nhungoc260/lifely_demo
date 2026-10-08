import { RequestDetailView } from "@/components/requests/request-detail-view";

export const metadata = { title: "Yêu cầu" };

export default function Page() {
  return <RequestDetailView basePath="/requester" />;
}
