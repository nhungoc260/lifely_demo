package com.lifely.matching;

/**
 * Kết quả liên hệ do NHÂN VIÊN tự ghi nhận sau khi gọi người hiến bằng ứng dụng gọi điện của thiết bị (liên kết tel:).
 * Hệ thống không gọi điện và không biết cuộc gọi có thành công hay không: việc bấm nút gọi KHÔNG tạo ra trạng thái nào.
 * Giá trị này không đổi trạng thái match, không cộng số đơn vị và không cho biết người hiến đủ điều kiện hiến máu.
 */
public enum ContactResult {
    NOT_CONTACTED, CONTACTED, UNREACHABLE, CONFIRMED_CAN_JOIN, CANNOT_JOIN
}
