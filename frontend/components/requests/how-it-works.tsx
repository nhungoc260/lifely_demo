import { Card } from "@/components/ui/card";

const STEPS = [
  { title: "Tạo yêu cầu", text: "Nhập nhóm máu, số lượng, bệnh viện và thời hạn cần máu." },
  { title: "Được xác minh", text: "Quản trị viên xác minh để tránh thông tin giả. Yêu cầu từ tổ chức y tế đã xác minh được điều phối ngay." },
  { title: "Người hiến nhận lời", text: "LIFELY liên hệ người hiến phù hợp gần bệnh viện. Người nhận lời sẽ hiện ngay trên trang này." },
];

/** Dành cho người dùng mới: 3 bước ngắn để biết mình sẽ làm gì và chuyện gì xảy ra sau đó. */
export function HowItWorks() {
  return (
    <Card className="p-5 md:p-6">
      <h2 className="text-lg font-semibold tracking-tight">Cần máu? Đây là cách LIFELY giúp bạn</h2>
      <ol className="mt-4 grid gap-5 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground" aria-hidden>{i + 1}</span>
            <div>
              <p className="font-medium">{s.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">LIFELY chỉ hỗ trợ kết nối. Việc truyền máu và điều kiện hiến máu do bệnh viện và nhân viên y tế quyết định.</p>
    </Card>
  );
}
