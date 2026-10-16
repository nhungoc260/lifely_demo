# Kịch bản demo 10–15 phút

> Mọi tài khoản và dữ liệu trong kịch bản là **giả** (`tools/demo/seed_demo.sh`). Số điện thoại demo (`00000000xx`) không gọi hay nhắn được, nên nút **Gọi ngay** chỉ mở trình quay số. Nói rõ điều này với hội đồng.

## 0. Chuẩn bị (làm trước 30 phút, không làm trước mặt hội đồng)
1. **Đánh thức backend** (gói miễn phí hay ngủ): mở `https://<backend>/api/health`, chờ trả về OK, mở thêm 1–2 lần.
2. **Nạp dữ liệu demo**: `DEMO_PASSWORD=<mật khẩu tự chọn> PGPASSWORD=<mật khẩu DB> ./tools/demo/seed_demo.sh` (chạy lại bao nhiêu lần cũng được; làm mới trạng thái theo ngày hôm nay).
3. **Bật thông báo đẩy ở máy chủ**: `NOTIFY_PUSH_ENABLED=true` và 3 biến `VAPID_*` (sinh bằng `tools/push/generate-vapid-keys.sh`), triển khai lại.
4. **Cài ứng dụng lên điện thoại** (xem `DEVICE_TEST_CHECKLIST.md`): Android Chrome → Cài đặt ứng dụng; iPhone Safari → Chia sẻ → Thêm vào MH chính, rồi mở từ biểu tượng.
5. Trên điện thoại đăng nhập `demo-donor-eligible@lifely.demo` → **Hồ sơ → Kênh nhận thông báo → Bật thông báo đẩy → Gửi thử** để chắc máy đã nhận.
6. Trên laptop mở 2 cửa sổ ẩn danh: `demo-hospital@lifely.demo` và `demo-donor-deferred@lifely.demo`.
7. Với tài khoản bệnh viện: **Lịch hiến → Mở khung giờ** ngày mai 09:00–10:00, sức chứa 3.
8. **Quay video màn hình toàn bộ kịch bản làm phương án cuối cùng.** Tải ảnh chụp các màn hình chính.

Tài khoản (mật khẩu = `DEMO_PASSWORD`): `demo-requester` (người cần máu), `demo-donor-eligible` (nam, O+, đủ điều kiện), `demo-donor-deferred` (nam, A+, mới hiến 30 ngày, có một lần đo huyết áp ngoài ngưỡng), `demo-donor-female` (nữ, B+, cân nặng 43 kg), `demo-hospital`, `demo-admin`, tất cả dạng `demo-…@lifely.demo`.

## 1. Diễn biến (khoảng 13 phút)
| Phút | Ai / thiết bị | Thao tác | Điều cần nói |
|---|---|---|---|
| 0:00 | Slide | Bài toán: cần máu khẩn cấp nhưng không biết ai gần đó sẵn sàng | Điều phối, không phải ngân hàng máu |
| 1:30 | Điện thoại | Mở app từ **biểu tượng đã cài** (toàn màn hình). Vào Hồ sơ → **Kênh nhận thông báo** | PWA cài như app thật; thông báo đẩy bật bằng sự đồng ý của người dùng; SMS/gọi tự động đang giả lập, tắt mặc định |
| 3:00 | Laptop, bệnh viện | **Yêu cầu mới**: O+, 1 đơn vị, mức khẩn cấp cao, gắn Bệnh viện Demo → Tạo | Kết quả hiện "Yêu cầu đã được tiếp nhận", **không** nói "đã có máu"; không cần admin duyệt vì gắn cơ sở đã xác minh |
| 4:30 | Điện thoại | Khóa màn hình, chờ **thông báo đẩy** "Có người cần máu gần bạn", bấm vào | Hệ thống chỉ mời người **đủ điều kiện giãn cách, đúng nhóm máu, ở gần**; nội dung không có dữ liệu bệnh nhân |
| 5:30 | Laptop, tài khoản `deferred` | (tuỳ chọn) bệnh viện tạo thêm yêu cầu **A+**; người này **không** nhận lời mời | Người hiến mới hiến 30 ngày trước nên chưa được mời |
| 6:00 | Điện thoại | Menu tài khoản → **Sức khỏe của tôi**. Nhập HR 72, 120/80, 68 kg → **Kiểm tra** | "Trong ngưỡng sàng lọc sơ bộ"; trạng thái **Có thể hiến** |
| 7:00 | Điện thoại | Nhập HR 95, 165/98 → Kiểm tra (kết quả thứ hai) | "Ngoài ngưỡng", **kèm lời nhắc không phải chẩn đoán** và khuyên trao đổi với nhân viên y tế. Chỉ là hỗ trợ sơ bộ |
| 8:00 | Điện thoại | Xem biểu đồ xu hướng; chuyển chế độ tối | Dải ngưỡng, hình thoi đánh dấu điểm ngoài ngưỡng |
| 8:30 | Điện thoại | Quay lại **Yêu cầu** → **Nhận lời** → bấm **Gọi ngay** | Chỉ sau khi nhận lời mới hiện số liên hệ; số demo là số giả |
| 9:30 | Điện thoại | **Đặt lịch hiến** → chọn khung giờ ngày mai → Đặt lịch | Lịch hẹn ≠ máu có sẵn; hết chỗ thì báo rõ; nhắc lịch tự động |
| 10:30 | Laptop, bệnh viện | **Lịch hiến** → Xem người đặt → **Đã đến → Đạt sàng lọc → Xác nhận đã hiến** | Chỉ nhân viên cơ sở mới xác nhận; mỗi bước là một trạng thái riêng |
| 11:30 | Laptop, bệnh viện | **Kho máu**: O+ tăng 1 đơn vị (có dòng trong sổ biến động). Rồi mở chi tiết **yêu cầu khẩn cấp** | Kho chỉ tăng **sau xác nhận hiến của cơ sở**. Yêu cầu khẩn cấp vẫn "Đang phối hợp": **1/1 người nhận lời nhưng 0/1 đơn vị được xác nhận hiến**, tức "nhận lời" khác "đã có máu" |
| 12:30 | Laptop | **Phản hồi và thông báo** ở chi tiết yêu cầu | Bệnh viện theo dõi số người đã mời, nhận lời, trạng thái gửi |
| 13:00 | – | Hỏi đáp (xem `REPORT_UPDATES.md`) | |

> **Hai luồng tách biệt.** Xác nhận hiến theo *lịch hẹn* (Luồng B) cộng kho nhưng **không** làm yêu cầu khẩn cấp (Luồng A) đủ đơn vị. Muốn đóng yêu cầu khẩn cấp: ở chi tiết yêu cầu, bấm **Đã hiến** trên người đã nhận lời. Demo **không** làm cả hai cho cùng một người để khỏi cộng kho hai lần cho một lần hiến.

## 2. Phương án dự phòng
| Sự cố | Cách xử lý |
|---|---|
| **Mạng yếu / mất mạng** | Chuyển sang hotspot 4G của điện thoại thứ hai; nếu vẫn không được, phát **video quay sẵn** và mô tả từng bước. Trang ngoại tuyến của app vẫn hiện hướng dẫn gọi 115 |
| **Backend gói miễn phí đang ngủ** (trang quay mãi) | Đã đánh thức ở bước 0; nếu vẫn ngủ, mở `/api/health` và chờ 30–60 giây trong lúc nói phần giới thiệu. Không bấm liên tục |
| **Thông báo đẩy chưa tới** | Đợi tối đa 20 giây (worker gửi mỗi 10 giây). Không tới thì: (1) mở mục **Thông báo** trong app: thông báo trong ứng dụng luôn có; (2) bấm **Gửi thử** để chứng minh kênh đẩy; (3) cho xem ảnh chụp/video. Nói thẳng đây là thông báo đẩy phụ thuộc hệ điều hành và nhà cung cấp |
| **iPhone không nhận thông báo** | iPhone chỉ nhận khi đã Thêm vào MH chính và mở từ biểu tượng. Dùng Android làm máy chính |
| **Không có người hiến phù hợp được mời** | Kiểm tra seed đã chạy hôm nay (ngày hiến tính theo hôm nay), tài khoản `eligible` đang "Sẵn sàng", nhóm máu yêu cầu O+ |
| **Máy chủ lỗi 500** | Dùng video quay sẵn. Không sửa trực tiếp trước hội đồng |
| **Quên mật khẩu demo** | Chạy lại `seed_demo.sh` với `DEMO_PASSWORD` mới |

## 3. Dọn dẹp sau demo
`PGPASSWORD=<mật khẩu DB> ./tools/demo/seed_demo.sh --clear` xóa toàn bộ dữ liệu demo mới (và dữ liệu phát sinh từ các tài khoản này).
