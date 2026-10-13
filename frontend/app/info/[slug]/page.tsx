import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { ContactForm } from "@/components/support/contact-form";
import { STAFF, SUPPORT } from "@/lib/support";

interface Doc { title: string; intro: string; sections: { h: string; p: string }[] }

const DISCLAIMER = "LIFELY là nền tảng điều phối, không đưa ra chẩn đoán, điều trị, quyết định truyền máu hay quyết định cuối cùng về điều kiện hiến máu. Các quyết định này phải do nhân viên y tế có chuyên môn đưa ra.";

const DOCS: Record<string, Doc> = {
  faq: {
    title: "Câu hỏi thường gặp",
    intro: "Giải đáp nhanh về cách LIFELY hoạt động.",
    sections: [
      { h: "LIFELY có quyết định ai được hiến máu không?", p: "Không. LIFELY chỉ sắp xếp và thông báo cho những người có thể giúp. Nhân viên y tế luôn là người quyết định cuối cùng về điều kiện hiến máu." },
      { h: "Ai nhìn thấy số điện thoại của tôi?", p: "Mặc định là không ai. Người cần máu chỉ thấy tên và số điện thoại của bạn sau khi bạn nhận lời yêu cầu của họ, để hai bên phối hợp." },
      { h: "LIFELY chọn người hiến máu như thế nào?", p: "Dựa trên các quy tắc rõ ràng: tương thích nhóm máu, khoảng cách, trạng thái sẵn sàng, khả năng đến bệnh viện kịp giờ và thời gian từ lần hiến gần nhất. Không dùng AI." },
      { h: "Vì sao yêu cầu của tôi chưa được đăng ngay?", p: "Yêu cầu từ cá nhân được admin hoặc bệnh viện đã xác minh kiểm tra trước, để tránh yêu cầu giả hoặc trùng lặp. Yêu cầu từ tổ chức đã xác minh được đăng ngay." },
      { h: "Hệ thống có kết nối với hệ thống bệnh viện thật không?", p: "Bản mẫu này chưa tích hợp với hồ sơ bệnh án, kho máu hay hệ thống định danh của nhà nước." },
    ],
  },
  safety: {
    title: "An toàn",
    intro: "Cách chúng tôi bảo vệ người hiến máu, bệnh nhân và gia đình.",
    sections: [
      { h: "Xác minh", p: "Tổ chức tải giấy tờ lên để đội ngũ của chúng tôi xem xét. Yêu cầu được xác minh trước khi liên hệ người hiến máu." },
      { h: "Quyền riêng tư của người hiến máu", p: "Chúng tôi chỉ hiển thị khu vực gần đúng, không bao giờ hiển thị vị trí chính xác, và không bao giờ công khai số điện thoại của người hiến máu." },
      { h: "Báo cáo vấn đề", p: "Dùng nút Báo cáo trên mỗi yêu cầu để báo thông tin giả, spam hoặc sai sự thật. Quản trị viên xem xét mọi báo cáo." },
      { h: "Trong trường hợp khẩn cấp", p: "Hãy liên hệ trực tiếp bệnh viện hoặc dịch vụ cấp cứu. LIFELY là công cụ hỗ trợ điều phối, không phải dịch vụ cấp cứu." },
    ],
  },
  contact: {
    title: "Liên hệ",
    intro: "Chúng tôi rất mong nhận được tin từ bạn.",
    sections: [
      { h: `Đường dây nhân viên: ${STAFF.map((s) => s.name).join(" · ")}`, p: `Gọi ${STAFF.map((s) => `${s.phoneDisplay} (${s.name})`).join(" hoặc ")} để được hỗ trợ tạo yêu cầu, đăng ký hiến máu hoặc mọi thắc mắc về LIFELY. Nếu bệnh nhân đang nguy kịch, hãy gọi cấp cứu ${SUPPORT.emergencyNumber} hoặc bệnh viện trước: LIFELY là nền tảng điều phối, không phải dịch vụ cấp cứu.` },
      { h: "Email", p: STAFF.map((s) => `${s.email} (${s.name})`).join(" hoặc ") + "." },
      { h: "Hợp tác", p: "Bệnh viện và trung tâm máu có thể đăng ký ngay ở trang đăng ký; đội ngũ của chúng tôi sẽ xem xét giấy tờ của bạn." },
    ],
  },
  privacy: {
    title: "Quyền riêng tư",
    intro: "Chúng tôi thu thập gì và vì sao.",
    sections: [
      { h: "Chúng tôi thu thập gì", p: "Thông tin tài khoản, nhóm máu, vị trí gần đúng chỉ dùng để kết nối, trạng thái sẵn sàng và lịch sử hiến máu mà bạn chọn chia sẻ." },
      { h: "Những gì chúng tôi không bao giờ công khai", p: "Vị trí chính xác của người hiến máu, số điện thoại riêng, và thông tin bệnh nhân hay thông tin y tế." },
      { h: "Quyền kiểm soát của bạn", p: "Bạn có thể tắt kết nối khẩn cấp và thông báo bất cứ lúc nào trong phần cài đặt riêng tư của hồ sơ." },
      { h: "Lưu trữ", p: "Các bản ghi quan trọng như yêu cầu được giữ lại kèm trạng thái thay vì xóa, để mọi hoạt động đều truy vết được." },
    ],
  },
  terms: {
    title: "Điều khoản sử dụng",
    intro: "Vui lòng đọc trước khi dùng LIFELY.",
    sections: [
      { h: "Sử dụng hợp lệ", p: "Không tạo yêu cầu giả, spam, quấy rối người khác hoặc lạm dụng thông tin liên hệ được chia sẻ với bạn." },
      { h: "Không phải dịch vụ y tế", p: DISCLAIMER },
      { h: "Tài khoản", p: "Chúng tôi có thể khóa tài khoản vi phạm các điều khoản này để bảo vệ bệnh nhân và người hiến máu." },
    ],
  },
  "medical-disclaimer": {
    title: "Tuyên bố miễn trừ y tế",
    intro: "Thông tin quan trọng về việc LIFELY là gì và không phải là gì.",
    sections: [{ h: "Chỉ điều phối", p: DISCLAIMER }, { h: "Điểm kết nối", p: "Điểm kết nối chỉ dùng để ưu tiên điều phối. Đây không phải đánh giá y tế." }],
  },
};

export function generateStaticParams() {
  return Object.keys(DOCS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: DOCS[slug]?.title ?? "LIFELY" };
}

export default async function InfoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = DOCS[slug];
  if (!doc) notFound();
  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-5 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">{doc.title}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{doc.intro}</p>
        <div className="mt-10 space-y-8">
          {doc.sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-lg font-semibold">{s.h}</h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">{s.p}</p>
            </section>
          ))}
        </div>
        {slug === "contact" && <div className="mt-12"><ContactForm /></div>}
      </main>
      <Footer />
    </>
  );
}
