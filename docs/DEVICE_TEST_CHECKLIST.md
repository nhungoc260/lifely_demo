# Danh sách kiểm tra trên thiết bị thật

> **Chưa có mục nào dưới đây được thử trên thiết bị thật** (môi trường làm việc không có điện thoại). Đánh dấu ✅ từng mục khi nhóm đã tự thử, ghi máy, hệ điều hành và trình duyệt.
> Điều kiện chung: dùng bản triển khai có **HTTPS** (Web Push và cài ứng dụng không chạy trên http, trừ localhost), `NOTIFY_PUSH_ENABLED=true`, đã đặt `VAPID_*` (xem `tools/push/generate-vapid-keys.sh`), đã chạy `tools/demo/seed_demo.sh`.

Ghi chú máy thử: ______________________  Ngày thử: ____________  Người thử: ____________

## 1. iPhone Safari (iOS 16.4 trở lên)
| ✅ | Bước | Kết quả mong đợi |
|---|---|---|
| ☐ | Mở trang bằng **Safari** (không dùng Chrome iOS), đăng nhập `demo-donor-eligible@lifely.demo` | Đăng nhập được, giao diện vừa màn hình |
| ☐ | Vào Hồ sơ → "Kênh nhận thông báo", bấm **Bật** thông báo đẩy khi **chưa** cài | Hiện hướng dẫn "Thêm vào MH chính", nút Bật bị khóa (đúng thiết kế) |
| ☐ | Bấm Chia sẻ → **Thêm vào MH chính** → mở LIFELY từ biểu tượng mới | Mở toàn màn hình, không có thanh địa chỉ, đúng icon giọt máu |
| ☐ | Đăng nhập lại (nếu cần) → Hồ sơ → **Bật** thông báo đẩy → chọn **Cho phép** | Hiện "Đã bật thông báo đẩy trên thiết bị này" |
| ☐ | Bấm **Gửi thử** (khi đã khóa màn hình) | Trong vài giây nhận thông báo "Thông báo thử từ LIFELY" |
| ☐ | Bệnh viện tạo yêu cầu O+ (xem `DEMO_SCRIPT.md`) | Điện thoại nhận thông báo "Có người cần máu gần bạn"; bấm vào mở đúng trang Yêu cầu |
| ☐ | Bật chế độ máy bay rồi mở lại ứng dụng (**offline**) | Hiện trang "Bạn đang ngoại tuyến" kèm nút gọi 115; **không** hiện dữ liệu cá nhân |
| ☐ | Tắt máy bay | Bấm "Thử kết nối lại" quay về ứng dụng bình thường |
| ☐ | Bật/tắt chế độ tối của iOS | Giao diện và biểu đồ ở trang Sức khỏe vẫn đọc rõ |
| ☐ | Bấm "Gọi ngay" ở trang chi tiết yêu cầu (sau khi nhận lời) | Mở trình quay số với số đã nhận lời (số demo là số giả nên không gọi được) |

## 2. Android Chrome
| ✅ | Bước | Kết quả mong đợi |
|---|---|---|
| ☐ | Mở trang bằng Chrome, đăng nhập | Bình thường |
| ☐ | Menu ⋮ → **Cài đặt ứng dụng** (hoặc Thêm vào MH chính) | Có tùy chọn cài; sau khi cài, icon giọt máu đúng, **không có thanh địa chỉ** |
| ☐ | Hồ sơ → Bật thông báo đẩy → **Cho phép** | "Đã bật thông báo đẩy trên thiết bị này" |
| ☐ | **Gửi thử** khi đã khóa màn hình và khi ứng dụng đã đóng hẳn | Nhận được thông báo; bấm vào mở đúng trang |
| ☐ | Tạo yêu cầu khẩn cấp từ máy khác | Nhận thông báo "Có người cần máu gần bạn" |
| ☐ | Tạo yêu cầu **A+** khi dùng tài khoản `demo-donor-deferred` (hiến cách đây 30 ngày) | **Không** nhận thông báo khẩn cấp (chưa đủ giãn cách) |
| ☐ | Tắt Wi‑Fi/dữ liệu rồi mở lại | Hiện trang ngoại tuyến, có nút gọi 115 |
| ☐ | Từ chối quyền thông báo rồi vào lại mục thông báo đẩy | Hiện hướng dẫn mở cài đặt để cho phép lại |
| ☐ | Bật chế độ tối hệ thống | Giao diện, biểu đồ, trang ngoại tuyến đọc rõ |

## 3. APK Android (nhóm tự build, **chưa build trong lần làm việc này**)
Cách nhanh, miễn phí: dùng **PWABuilder** (pwabuilder.com) hoặc **Bubblewrap** để bọc PWA thành APK dạng Trusted Web Activity.
| ✅ | Bước | Ghi chú |
|---|---|---|
| ☐ | Nhập địa chỉ HTTPS của bản triển khai, tạo gói Android | Package name ví dụ `vn.edu.lifely` (tự đặt) |
| ☐ | Ký APK, **lưu keystore ở nơi an toàn, không commit** | Mất keystore là không cập nhật được app |
| ☐ | Đưa `assetlinks.json` (có SHA-256 của khóa ký) vào `/.well-known/assetlinks.json` của website | Thiếu bước này thanh địa chỉ vẫn hiện trong APK |
| ☐ | Cài APK (cho phép nguồn không xác định), mở app | Toàn màn hình, không thanh địa chỉ |
| ☐ | Thử thông báo đẩy trong APK | Có thể cần bật lại thông báo trong cài đặt app |

## 4. Mạng và màn hình
| ✅ | Bước | Kết quả mong đợi |
|---|---|---|
| ☐ | Đổi Wi‑Fi ↔ 4G khi đang mở ứng dụng | Không mất phiên đăng nhập; thao tác tiếp theo vẫn chạy |
| ☐ | Mạng chậm (giả lập 3G) mở trang Yêu cầu và Sức khỏe | Có khung chờ (skeleton), không trắng trang |
| ☐ | Màn hình nhỏ (iPhone SE / máy 360 px) | Không có thanh cuộn ngang; nút chạm dễ bấm; biểu đồ vừa khung |
| ☐ | Xoay ngang | Bố cục vẫn dùng được |
| ☐ | Phóng to chữ trong cài đặt hệ thống | Không bị cắt chữ |
| ☐ | Chế độ tối và sáng | Chữ đủ tương phản; điểm "ngoài ngưỡng" phân biệt được bằng hình thoi, không chỉ bằng màu |

## 5. Kết quả
Tổng số mục: ____ | Đạt: ____ | Lỗi: ____ | Ghi chú lỗi và cách khắc phục: ______________________
