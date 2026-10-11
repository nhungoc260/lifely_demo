package com.lifely.matching;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

/**
 * Ước lượng thời gian di chuyển của người hiến tới nơi cần máu. Chỉ phục vụ điều phối, không phải cam kết.
 * Quãng đường = đường chim bay x hệ số đường thực tế; tốc độ chọn theo giờ xuất phát (giờ địa phương):
 * cao điểm sáng/chiều các ngày trong tuần chậm nhất, ban đêm nhanh nhất. Chưa gọi dịch vụ chỉ đường thật
 * và không theo dõi tắc đường theo thời gian thực.
 */
public final class TravelTimeEstimator {

    private TravelTimeEstimator() {
    }

    public static double minutes(MatchingProperties props, double straightLineKm, Instant departure) {
        double roadKm = straightLineKm * props.getRoadFactor();
        return roadKm / speedKmh(props, departure) * 60.0;
    }

    public static double speedKmh(MatchingProperties props, Instant departure) {
        ZonedDateTime local = departure.atZone(ZoneId.of(props.getTimezone()));
        LocalTime t = local.toLocalTime();
        if (isNight(props, t)) {
            return props.getNightSpeedKmh();
        }
        boolean weekday = local.getDayOfWeek() != DayOfWeek.SATURDAY && local.getDayOfWeek() != DayOfWeek.SUNDAY;
        boolean peak = within(t, props.getPeakMorningStart(), props.getPeakMorningEnd())
                || within(t, props.getPeakEveningStart(), props.getPeakEveningEnd());
        return weekday && peak ? props.getPeakSpeedKmh() : props.getNormalSpeedKmh();
    }

    private static boolean within(LocalTime t, LocalTime start, LocalTime end) {
        return !t.isBefore(start) && t.isBefore(end);
    }

    /** Khung đêm có thể vắt qua nửa đêm (ví dụ 22:00-05:00). */
    private static boolean isNight(MatchingProperties props, LocalTime t) {
        LocalTime start = props.getNightStart();
        LocalTime end = props.getNightEnd();
        return start.isBefore(end) ? within(t, start, end) : (!t.isBefore(start) || t.isBefore(end));
    }
}
