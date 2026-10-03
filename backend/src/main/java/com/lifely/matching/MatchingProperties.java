package com.lifely.matching;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

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
    private double averageSpeedKmh = 25.0;
    private int prepMinutes = 30;
    private int escalationMinutesCritical = 5;
    private int escalationMinutesUrgent = 15;
    private int escalationMinutesNormal = 60;
}
