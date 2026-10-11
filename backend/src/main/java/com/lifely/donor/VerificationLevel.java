package com.lifely.donor;

/**
 * Mức xác nhận của một lần hiến máu. LIFELY không tự xác minh được nhóm máu hay việc đã hiến:
 * độ tin cậy phụ thuộc vào người nào xác nhận, và chỉ tổ chức y tế đã được admin xác minh mới đạt mức cao nhất.
 */
public enum VerificationLevel {
    /** Donor tự khai. */
    SELF_REPORTED,
    /** Người nhà hoặc bên điều phối xác nhận (chưa phải cơ sở y tế). */
    REQUESTER_CONFIRMED,
    /** Tổ chức y tế đã xác minh, sở hữu yêu cầu máu đó, xác nhận. */
    ORG_VERIFIED;

    /** Mức độ tin cậy tăng dần theo thứ tự khai báo. */
    public boolean isHigherThan(VerificationLevel other) {
        return ordinal() > other.ordinal();
    }

    public static VerificationLevel parse(String value) {
        try {
            return value == null ? SELF_REPORTED : valueOf(value);
        } catch (IllegalArgumentException e) {
            return SELF_REPORTED;
        }
    }
}
