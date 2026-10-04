export interface Faq {
  q: string;
  a: string;
  keywords: string[];
}

/** Trả lời theo kịch bản (rule-based), không dùng AI và không đưa ra tư vấn y tế. */
export const FAQS: Faq[] = [
  { q: "Tôi cần máu gấp, phải làm gì?", a: "Nếu bệnh nhân đang nguy kịch, hãy gọi cấp cứu 115 hoặc liên hệ bệnh viện ngay. Song song, bạn bấm \"I NEED BLOOD\" để tạo yêu cầu; sau khi được xác minh, LIFELY sẽ liên hệ người hiến ở gần. Cần hỗ trợ tạo yêu cầu, bạn có thể gọi nhân viên.", keywords: ["cần máu", "gấp", "khẩn", "nguy kịch", "bệnh nhân", "tạo yêu cầu", "need blood", "urgent"] },
  { q: "Tôi muốn hiến máu, bắt đầu từ đâu?", a: "Đăng ký tài khoản Donor, hoàn tất 6 bước hồ sơ (nhóm máu, khu vực, lần hiến gần nhất), rồi bật \"Available\". LIFELY chỉ thông báo khi có yêu cầu đã xác minh phù hợp với bạn.", keywords: ["hiến máu", "đăng ký", "donor", "bắt đầu", "tham gia", "donate"] },
  { q: "LIFELY có quyết định tôi đủ điều kiện hiến máu không?", a: "Không. LIFELY chỉ hỗ trợ điều phối. Điều kiện hiến máu và quyết định truyền máu do nhân viên y tế có chuyên môn quyết định. Điểm phù hợp chỉ dùng để sắp xếp thứ tự liên hệ.", keywords: ["đủ điều kiện", "điều kiện", "sức khỏe", "được hiến", "eligib", "y tế", "bao lâu"] },
  { q: "Số điện thoại và vị trí của tôi có bị công khai không?", a: "Không. Vị trí chính xác của donor không bao giờ hiển thị; người khác chỉ thấy quận/huyện. Số điện thoại chỉ được chia sẻ sau khi donor chấp nhận một yêu cầu cụ thể.", keywords: ["số điện thoại", "riêng tư", "vị trí", "công khai", "bảo mật", "privacy", "thông tin"] },
  { q: "Vì sao yêu cầu của tôi chưa được gửi đến người hiến?", a: "Yêu cầu từ cá nhân cần được quản trị viên hoặc bệnh viện liên kết xác minh trước để tránh yêu cầu giả. Yêu cầu từ tổ chức đã xác minh được xử lý ngay. Nếu đang rất gấp, hãy gọi nhân viên để được hỗ trợ.", keywords: ["xác minh", "chưa gửi", "chờ", "pending", "verification", "duyệt", "vì sao"] },
  { q: "Tổ chức/bệnh viện đăng ký như thế nào?", a: "Chọn vai trò Organization khi đăng ký, điền thông tin, tải giấy tờ (PDF/PNG/JPG, tối đa 5 MB) rồi bấm gửi xác minh. Quản trị viên sẽ xem xét và thông báo kết quả.", keywords: ["tổ chức", "bệnh viện", "organization", "trung tâm", "giấy tờ", "đăng ký tổ chức"] },
  { q: "Tôi quên mật khẩu?", a: "Vào trang Đăng nhập → \"Forgot password?\" và nhập email. Liên kết đặt lại có hiệu lực 30 phút. Nếu bạn là người dùng của bản demo, hãy liên hệ nhân viên.", keywords: ["mật khẩu", "quên", "password", "đăng nhập", "reset"] },
  { q: "Tôi không muốn nhận thông báo nữa?", a: "Vào Profile → Privacy để tắt \"Receive emergency notifications\" hoặc \"Allow emergency matching\", hoặc tắt \"Available\" bất cứ lúc nào.", keywords: ["thông báo", "tắt", "không muốn", "quấy rầy", "notification", "ngừng"] },
];

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
}

/** Tìm câu trả lời gần nhất theo từ khóa; trả mảng rỗng nếu không có gì khớp. */
export function searchFaq(query: string): Faq[] {
  const q = normalize(query.trim());
  if (q.length < 2) return [];
  const words = q.split(/\s+/).filter((w) => w.length > 1);
  return FAQS.map((f) => {
    const hay = normalize(`${f.q} ${f.keywords.join(" ")}`);
    let score = 0;
    f.keywords.forEach((k) => { if (q.includes(normalize(k))) score += 3; });
    words.forEach((w) => { if (hay.includes(w)) score += 1; });
    return { f, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map((x) => x.f);
}
