import { RequestsListView } from "@/components/requests/requests-list-view";

export const metadata = { title: "My requests" };

export default function Page() {
  return <RequestsListView basePath="/requester" />;
}
