package com.lifely.screening;

import java.util.ArrayList;
import java.util.List;

/**
 * So từng chỉ số với ngưỡng sàng lọc sơ bộ. KHÔNG chẩn đoán: chỉ trả "trong ngưỡng / ngoài ngưỡng" kèm lời nhắc
 * trao đổi với nhân viên y tế. Quyết định cuối cùng luôn thuộc về cơ sở y tế.
 */
public final class ScreeningEvaluator {

    public enum Status { WITHIN, OUTSIDE, NOT_MEASURED }

    public record Finding(String metric, String label, Double value, String unit, Status status,
                          String rangeText, String note, boolean provisional) {
    }

    public static final String DISCLAIMER = "Chỉ là hỗ trợ sàng lọc sơ bộ, không thay thế tư vấn y tế.";

    private ScreeningEvaluator() {
    }

    public static List<Finding> evaluate(ScreeningRules r, String gender, Integer heartRate, Integer systolic,
                                         Integer diastolic, Double weightKg) {
        List<Finding> out = new ArrayList<>();
        out.add(check("HEART_RATE", "Nhịp tim", heartRate == null ? null : heartRate.doubleValue(), "lần/phút",
                heartRate != null && heartRate >= r.heartRateMin() && heartRate <= r.heartRateMax(),
                r.heartRateMin() + "–" + r.heartRateMax() + " lần/phút", false));
        out.add(check("SYSTOLIC", "Huyết áp tâm thu", systolic == null ? null : systolic.doubleValue(), "mmHg",
                systolic != null && systolic >= r.systolicMin() && systolic < r.systolicMaxExclusive(),
                "từ " + r.systolicMin() + " đến dưới " + r.systolicMaxExclusive() + " mmHg", false));
        out.add(check("DIASTOLIC", "Huyết áp tâm trương", diastolic == null ? null : diastolic.doubleValue(), "mmHg",
                diastolic != null && diastolic >= r.diastolicMin() && diastolic < r.diastolicMaxExclusive(),
                "từ " + r.diastolicMin() + " đến dưới " + r.diastolicMaxExclusive() + " mmHg (ngưỡng tạm, cần đối chiếu)", true));
        double minWeight = "FEMALE".equals(gender) ? r.weightMinFemale() : r.weightMinOther();
        out.add(check("WEIGHT", "Cân nặng", weightKg, "kg", weightKg != null && weightKg >= minWeight,
                "từ " + trim(minWeight) + " kg trở lên", false));
        return out;
    }

    public static boolean anyOutside(List<Finding> findings) {
        return findings.stream().anyMatch(f -> f.status() == Status.OUTSIDE);
    }

    private static Finding check(String metric, String label, Double value, String unit, boolean within,
                                 String rangeText, boolean provisional) {
        if (value == null) {
            return new Finding(metric, label, null, unit, Status.NOT_MEASURED, rangeText, "Chưa có số liệu.", provisional);
        }
        if (within) {
            return new Finding(metric, label, value, unit, Status.WITHIN, rangeText,
                    "Nằm trong ngưỡng sàng lọc sơ bộ (" + rangeText + ").", provisional);
        }
        return new Finding(metric, label, value, unit, Status.OUTSIDE, rangeText,
                "Ngoài ngưỡng sàng lọc sơ bộ (" + rangeText + "). Hãy trao đổi với nhân viên y tế tại cơ sở; đây không phải chẩn đoán.",
                provisional);
    }

    private static String trim(double v) {
        return v == Math.floor(v) ? String.valueOf((long) v) : String.valueOf(v);
    }
}
