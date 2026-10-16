# Câu hỏi cần xác nhận

Hệ thống đang dùng các **giả định** bên dưới để chạy được. Chưa có mục nào được thầy hay cơ sở y tế xác nhận. Mỗi giá trị đều chỉnh được bằng cấu hình (không sửa code), vị trí ghi ở cột cuối.

## A. Hỏi thầy / giảng viên hướng dẫn
| # | Câu hỏi | Vì sao cần biết | Hiện trạng |
|---|---|---|---|
| 1 | PWA (cài từ trình duyệt) kèm APK Android bọc từ PWA có được tính là "ứng dụng" không? | Quyết định có phải viết app riêng không | Đã có PWA cài được, thông báo đẩy; **chưa build APK** (xem `DEVICE_TEST_CHECKLIST.md`) |
| 2 | Có bắt buộc app native (Android Studio) không? | Native tốn thêm nhiều tuần, không dùng lại code web | Chưa có app native |
| 3 | Có yêu cầu bản chạy trên iPhone không? | iPhone chỉ nhận thông báo đẩy khi đã "Thêm vào MH chính" (iOS 16.4 trở lên) | Có hướng dẫn trong app, **chưa thử trên iPhone thật** |
| 4 | Dữ liệu y tế dùng thật hay giả? | Quyết định mức bảo mật phải đạt và phải có đồng ý của ai | Mặc định **toàn dữ liệu giả** (`tools/demo`); số điện thoại giả `00000000xx` |
| 5 | SMS và cuộc gọi tự động có bắt buộc chạy thật không? | Cần nhà cung cấp, chi phí, mẫu tin được nhà mạng duyệt | Chỉ có khung và chế độ giả lập (`docs/NOTIFICATIONS.md`); thông báo đẩy và trong ứng dụng chạy thật |
| 6 | Có cần đo hiệu năng / kiểm thử tải không? | Chưa đo | Chưa làm |

## B. Hỏi cơ sở y tế (hoặc ghi rõ "giả định" trong báo cáo)
| # | Câu hỏi | Giả định đang dùng | Nguồn tham khảo | Chỉnh ở đâu |
|---|---|---|---|---|
| 1 | Ngưỡng nhịp tim cho phép hiến | 60–90 lần/phút | Thông tư 26/2013/TT-BYT (qua các bài tổng hợp, **chưa đối chiếu bản gốc còn hiệu lực**) | `lifely.screening.heart-rate-min/max` |
| 2 | Ngưỡng huyết áp tâm thu | từ 100 đến dưới 160 mmHg | như trên | `lifely.screening.systolic-*` |
| 3 | Ngưỡng huyết áp tâm trương | từ 60 đến dưới 100 mmHg, **giá trị tạm: chưa tìm thấy trong nguồn đã tra** | không có | `lifely.screening.diastolic-*` |
| 4 | Cân nặng tối thiểu | nữ 42 kg, nam 45 kg; chưa khai báo giới dùng 45 kg | Thông tư 26/2013/TT-BYT | `lifely.screening.weight-min-*` |
| 5 | Giãn cách giữa hai lần hiến | 84 ngày (12 tuần) cho mọi giới | Thông tư 26/2013/TT-BYT | `lifely.matching.min-days-between-donations` |
| 6 | Quy tắc riêng cho nữ | Hiện **bằng nam (84 ngày)**; có sẵn tham số để cơ sở đặt khác | – | `lifely.matching.min-days-between-donations-female` |
| 7 | Có ngưỡng Hb, tiền sử bệnh, thuốc, đi lại... cần đưa vào không? | Chưa đưa vào; sàng lọc thực tế do nhân viên y tế làm tại chỗ | – | – |
| 8 | Thời hạn hủy lịch | Chỉ hủy trước giờ hẹn ≥ 2 giờ | do nhóm đặt | `AppointmentService.CANCEL_CUTOFF` |
| 9 | Sức chứa mỗi khung giờ | Cơ sở tự đặt từ 1 đến 500 | do nhóm đặt | form mở khung giờ |
| 10 | Quy trình sàng lọc và tiếp nhận tại chỗ | LIFELY chỉ điều phối; mọi bước "đã đến → sàng lọc → đã hiến" do nhân viên cơ sở bấm | – | – |
| 11 | LIFELY có được ghi nhận kho máu của cơ sở không? | Chỉ khi cơ sở **tự bật** "tự cộng kho"; chỉ cộng sau khi cơ sở xác nhận đã hiến; có sổ biến động | – | cài đặt kho của cơ sở |
| 12 | Ai được xác nhận "đã hiến" | Chỉ nhân viên cơ sở đã xác minh gắn với yêu cầu/lịch; người nhà chỉ ghi nhận mức thấp, không đổi hồ sơ người hiến | – | `MatchService.complete` |
| 13 | Khi nào yêu cầu được huy động ngay | Yêu cầu gắn **bệnh viện đã xác minh** được huy động ngay, cơ sở nhận cảnh báo và có thể từ chối để dừng; yêu cầu không gắn cơ sở vẫn do admin duyệt | do nhóm đặt | `RequestService.create` |
| 14 | Thời gian lưu dữ liệu sức khỏe | Lưu đến khi người dùng xóa; không có hạn tự động | – | – |

> Mọi con số ở mục B đều là **giả định tham khảo, không phải khuyến cáo y tế**. Ghi rõ điều này trong báo cáo và khi trình bày.
