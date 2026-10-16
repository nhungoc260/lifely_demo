package com.lifely.screening;

/**
 * Ngưỡng sàng lọc sơ bộ. Đây là GIẢ ĐỊNH tham chiếu (xem docs/OPEN_QUESTIONS.md), phải được cơ sở y tế đối chiếu.
 * Giá trị mặc định lấy theo Thông tư 26/2013/TT-BYT (mạch 60-90, huyết áp tâm thu 100 đến dưới 160, cân nặng tối thiểu
 * 42 kg nữ / 45 kg nam). Ngưỡng huyết áp tâm trương là GIÁ TRỊ TẠM vì chưa tìm thấy trong nguồn đã tra.
 * Lớp thuần Java, không phụ thuộc Spring để kiểm thử độc lập.
 */
public record ScreeningRules(int heartRateMin, int heartRateMax,
                             int systolicMin, int systolicMaxExclusive,
                             int diastolicMin, int diastolicMaxExclusive,
                             double weightMinFemale, double weightMinOther) {

    public static ScreeningRules defaults() {
        return new ScreeningRules(60, 90, 100, 160, 60, 100, 42.0, 45.0);
    }
}
