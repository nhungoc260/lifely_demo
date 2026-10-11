package com.lifely.matching;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.LocalTime;
import java.util.List;

/** Tham số điều phối, chỉnh được trong application.yml (prefix lifely.matching). Chỉ phục vụ điều phối, không phải tiêu chuẩn y tế. */
@ConfigurationProperties(prefix = "lifely.matching")
@Getter
@Setter
public class MatchingProperties {

    /** Khoảng cách tối thiểu (ngày) giữa hai lần hiến để donor được đưa vào danh sách điều phối. */
    private int minDaysBetweenDonations = 84;
    /** Bán kính ngoài cùng của từng cấp: L1 0-5, L2 5-10, L3 10-20, L4 20-50 km. */
    private List<Double> levelRadiusKm = List.of(5.0, 10.0, 20.0, 50.0);
    private int candidatesPerUnit = 3;
    private int maxContactsPerRound = 15;
    private int candidatePoolSize = 300;
    private double distanceScoreRangeKm = 30.0;
    /** Đường thực tế dài hơn đường chim bay (Haversine); hệ số nhân để ước lượng quãng đường đi. */
    private double roadFactor = 1.35;
    /** Tốc độ di chuyển trung bình trong nội thành theo khung giờ (giờ địa phương, thứ Hai-thứ Sáu cho giờ cao điểm). */
    private double peakSpeedKmh = 15.0;
    private double normalSpeedKmh = 25.0;
    private double nightSpeedKmh = 35.0;
    private String timezone = "Asia/Ho_Chi_Minh";
    private LocalTime peakMorningStart = LocalTime.of(6, 30);
    private LocalTime peakMorningEnd = LocalTime.of(9, 0);
    private LocalTime peakEveningStart = LocalTime.of(16, 30);
    private LocalTime peakEveningEnd = LocalTime.of(19, 30);
    private LocalTime nightStart = LocalTime.of(22, 0);
    private LocalTime nightEnd = LocalTime.of(5, 0);
    private int prepMinutes = 30;
    private int escalationMinutesCritical = 5;
    private int escalationMinutesUrgent = 15;
    private int escalationMinutesNormal = 60;
}
