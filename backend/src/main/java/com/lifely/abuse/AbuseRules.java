package com.lifely.abuse;

/**
 * Quy tắc phát hiện bất thường, thuần hàm (không đụng DB) để kiểm thử dễ và giải thích được cho admin.
 * Nguyên tắc: chỉ TỰ ĐỘNG DỪNG (HIGH) khi tín hiệu rất mạnh; còn lại cho đi tiếp và đưa vào hàng đợi admin (MEDIUM),
 * vì dừng nhầm một ca khẩn cấp thật gây hại nặng hơn để lọt một ca đáng ngờ.
 */
public final class AbuseRules {

    public enum Severity { MEDIUM, HIGH }

    public record Finding(String ruleCode, Severity severity, String detail) {
    }

    /** Khoảng cách tối thiểu giữa hai lần hiến máu toàn phần: 12 tuần. */
    public static final int DONATION_INTERVAL_DAYS = 84;
    /** Mức hỗ trợ đi lại tối đa theo quy định cho mỗi lần hiến (đồng). */
    public static final int MAX_TRAVEL_SUPPORT_VND = 50_000;
    /** Từ ngưỡng này (km, đường chim bay nhà tới bệnh viện) yêu cầu được đưa vào hàng đợi để admin xem. */
    public static final double FAR_HOME_KM = 300;
    /** Một cơ sở ghi nhận từ ngần này lượt hỗ trợ trong 1 giờ là dồn dập bất thường. */
    public static final int ORG_SUPPORT_BURST_PER_HOUR = 20;
    /** Xác nhận "đã hiến" sớm hơn ngần này phút sau giờ bắt đầu khung giờ là quá nhanh (lấy máu cần khám sàng lọc + lấy máu). */
    public static final int MIN_DONATION_MINUTES = 20;

    private AbuseRules() {
    }

    /** Cùng một SĐT liên hệ xuất hiện ở từ 3 tài khoản khác nhau trong 30 ngày: nuôi nhiều tài khoản. */
    public static Finding phoneSharing(long distinctAccounts) {
        return distinctAccounts >= 3 ? new Finding("PHONE_SHARED", Severity.HIGH,
                "Cùng một số điện thoại liên hệ được dùng bởi " + distinctAccounts + " tài khoản trong 30 ngày") : null;
    }

    /** Tạo yêu cầu dồn dập: từ 5 yêu cầu trong 1 giờ là chặn, từ 3 yêu cầu trong 24 giờ là theo dõi. */
    public static Finding velocity(long lastHour, long last24h) {
        if (lastHour >= 5) {
            return new Finding("REQUEST_BURST", Severity.HIGH, lastHour + " yêu cầu trong 1 giờ");
        }
        return last24h >= 3 ? new Finding("REQUEST_FREQUENT", Severity.MEDIUM, last24h + " yêu cầu trong 24 giờ") : null;
    }

    public static Finding repeatedCancel(long cancelled24h) {
        return cancelled24h >= 3 ? new Finding("REPEATED_CANCEL", Severity.MEDIUM,
                cancelled24h + " yêu cầu bị hủy trong 24 giờ rồi tạo tiếp") : null;
    }

    /** Tài khoản mới tinh tạo yêu cầu nguy kịch mà không gắn bệnh viện đã xác minh. */
    public static Finding newAccountCritical(boolean accountUnder30Min, boolean critical, boolean hasVerifiedFacility) {
        return accountUnder30Min && critical && !hasVerifiedFacility ? new Finding("NEW_ACCOUNT_CRITICAL", Severity.MEDIUM,
                "Tài khoản vừa tạo dưới 30 phút đã gửi yêu cầu nguy kịch, chưa gắn bệnh viện đã xác minh") : null;
    }

    public static Finding highUnits(int units, boolean hasVerifiedFacility) {
        return units >= 10 && !hasVerifiedFacility ? new Finding("HIGH_UNITS", Severity.MEDIUM,
                "Yêu cầu " + units + " đơn vị mà không gắn bệnh viện đã xác minh") : null;
    }

    /** Nhà cách bệnh viện quá xa: có thể là bệnh nhân từ tỉnh xa lên, nên chỉ để admin xem, không tự động dừng. */
    public static Finding homeFar(double km) {
        return km > FAR_HOME_KM ? new Finding("HOME_FAR_FROM_HOSPITAL", Severity.MEDIUM,
                String.format(java.util.Locale.ROOT, "Nhà cách bệnh viện khoảng %.0f km (đường chim bay)", km)) : null;
    }

    /** Người hiến đã có lần hiến được xác nhận trong 12 tuần gần đây mà lại được ghi nhận hỗ trợ tiếp. */
    public static Finding donationTooSoon(long daysSinceLast) {
        return daysSinceLast < DONATION_INTERVAL_DAYS ? new Finding("DONATION_TOO_SOON", Severity.HIGH,
                "Người hiến đã có lần hiến được xác nhận cách đây " + daysSinceLast + " ngày (tối thiểu "
                        + DONATION_INTERVAL_DAYS + " ngày)") : null;
    }

    /** Xác nhận "đã hiến" trước giờ bắt đầu khung giờ là vô lý; quá nhanh sau giờ bắt đầu là đáng ngờ. */
    public static Finding instantDonation(double minutesAfterStart) {
        if (minutesAfterStart < 0) {
            return new Finding("DONATED_BEFORE_START", Severity.HIGH, "Cơ sở xác nhận đã hiến trước giờ bắt đầu khung giờ");
        }
        return minutesAfterStart < MIN_DONATION_MINUTES ? new Finding("DONATED_TOO_FAST", Severity.MEDIUM,
                String.format(java.util.Locale.ROOT, "Xác nhận đã hiến chỉ %.0f phút sau giờ bắt đầu", minutesAfterStart)) : null;
    }

    /**
     * Luồng khẩn cấp: xác nhận "đã hiến" quá sớm sau khi người hiến nhận lời. Cần thời gian di chuyển, khám sàng lọc và lấy máu,
     * nên dưới 5 phút là không thể (chặn ghi nhận hỗ trợ), dưới 20 phút là đáng ngờ (chỉ để admin xem).
     */
    public static Finding matchCompletedTooFast(double minutesAfterAccept) {
        if (minutesAfterAccept < 5) {
            return new Finding("MATCH_COMPLETED_TOO_FAST", Severity.HIGH, String.format(java.util.Locale.ROOT,
                    "Xác nhận đã hiến chỉ %.0f phút sau khi người hiến nhận lời (cần di chuyển, khám sàng lọc, lấy máu)", Math.max(0, minutesAfterAccept)));
        }
        return minutesAfterAccept < MIN_DONATION_MINUTES ? new Finding("MATCH_COMPLETED_TOO_FAST", Severity.MEDIUM,
                String.format(java.util.Locale.ROOT, "Xác nhận đã hiến chỉ %.0f phút sau khi người hiến nhận lời", minutesAfterAccept)) : null;
    }

    public static Finding supportOverLimit(int amountVnd) {
        return amountVnd > MAX_TRAVEL_SUPPORT_VND ? new Finding("SUPPORT_OVER_LIMIT", Severity.MEDIUM,
                "Ghi nhận hỗ trợ " + amountVnd + "đ, vượt mức tối đa " + MAX_TRAVEL_SUPPORT_VND + "đ theo quy định") : null;
    }

    public static Finding orgBurst(long paidLastHour) {
        return paidLastHour >= ORG_SUPPORT_BURST_PER_HOUR ? new Finding("ORG_SUPPORT_BURST", Severity.MEDIUM,
                "Cơ sở ghi nhận " + paidLastHour + " lượt hỗ trợ trong 1 giờ") : null;
    }

    /** Khoảng cách đường chim bay (km), công thức haversine. */
    public static double haversineKm(double aLat, double aLng, double bLat, double bLng) {
        double dLat = Math.toRadians(bLat - aLat);
        double dLng = Math.toRadians(bLng - aLng);
        double h = Math.pow(Math.sin(dLat / 2), 2)
                + Math.cos(Math.toRadians(aLat)) * Math.cos(Math.toRadians(bLat)) * Math.pow(Math.sin(dLng / 2), 2);
        return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
    }
}
