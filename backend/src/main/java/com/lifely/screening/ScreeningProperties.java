package com.lifely.screening;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Ngưỡng sàng lọc sơ bộ (prefix lifely.screening). GIẢ ĐỊNH tham chiếu Thông tư 26/2013/TT-BYT, cần cơ sở y tế đối chiếu
 * bản còn hiệu lực. Ngưỡng huyết áp tâm trương là giá trị tạm. Có thể chỉnh bằng cấu hình mà không sửa code.
 */
@ConfigurationProperties(prefix = "lifely.screening")
@Getter
@Setter
public class ScreeningProperties {

    private int heartRateMin = 60;
    private int heartRateMax = 90;
    private int systolicMin = 100;
    private int systolicMaxExclusive = 160;
    private int diastolicMin = 60;
    private int diastolicMaxExclusive = 100;
    private double weightMinFemale = 42.0;
    private double weightMinOther = 45.0;

    public ScreeningRules rules() {
        return new ScreeningRules(heartRateMin, heartRateMax, systolicMin, systolicMaxExclusive,
                diastolicMin, diastolicMaxExclusive, weightMinFemale, weightMinOther);
    }
}
