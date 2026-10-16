package com.lifely.screening;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Quy tắc giãn cách giữa hai lần hiến. Mặc định theo cấu hình (84 ngày = 12 tuần theo nguồn đã tra, cho cả hai giới);
 * có tham số riêng cho nữ để cơ sở y tế chỉnh nếu quy định khác. GIẢ ĐỊNH, cần đối chiếu. Lớp thuần Java.
 */
public final class RejoinPolicy {

    private final int defaultDays;
    private final int femaleDays;

    public RejoinPolicy(int defaultDays, int femaleDays) {
        if (defaultDays < 1 || femaleDays < 1) {
            throw new IllegalArgumentException("Số ngày giãn cách phải dương");
        }
        this.defaultDays = defaultDays;
        this.femaleDays = femaleDays;
    }

    public int daysFor(String gender) {
        return "FEMALE".equals(gender) ? femaleDays : defaultDays;
    }

    /** Ngày sớm nhất được hiến lại; null nếu chưa từng hiến (không bị giới hạn). */
    public LocalDate eligibleOn(LocalDate lastDonation, String gender) {
        return lastDonation == null ? null : lastDonation.plusDays(daysFor(gender));
    }

    public boolean canDonate(LocalDate lastDonation, String gender, LocalDate today) {
        LocalDate on = eligibleOn(lastDonation, gender);
        return on == null || !on.isAfter(today);
    }

    public long daysRemaining(LocalDate lastDonation, String gender, LocalDate today) {
        LocalDate on = eligibleOn(lastDonation, gender);
        return on == null ? 0 : Math.max(0, ChronoUnit.DAYS.between(today, on));
    }
}
