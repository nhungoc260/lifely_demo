import { RequestsListView } from "@/components/requests/requests-list-view";

export const metadata = { title: "Yêu cầu của tôi" };

export default function Page() {
  return <RequestsListView basePath="/requester" />;
}
