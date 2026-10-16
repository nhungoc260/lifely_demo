import com.lifely.screening.*;
import com.lifely.screening.ScreeningEvaluator.Status;
import java.time.LocalDate;
import java.util.List;

public class PureCheck {
    static int pass, fail;
    static void ok(String n, boolean c) { if (c) pass++; else fail++; System.out.println((c ? "PASS " : "FAIL ") + n); }
    static Status st(List<ScreeningEvaluator.Finding> f, String m) { return f.stream().filter(x -> x.metric().equals(m)).findFirst().get().status(); }
    public static void main(String[] x) {
        ScreeningRules r = ScreeningRules.defaults();
        // Biên mạch 60-90 (đóng hai đầu)
        for (int hr : new int[]{60, 75, 90}) ok("mạch " + hr + " trong ngưỡng", st(ScreeningEvaluator.evaluate(r, "MALE", hr, null, null, null), "HEART_RATE") == Status.WITHIN);
        for (int hr : new int[]{59, 91}) ok("mạch " + hr + " ngoài ngưỡng", st(ScreeningEvaluator.evaluate(r, "MALE", hr, null, null, null), "HEART_RATE") == Status.OUTSIDE);
        // Huyết áp tâm thu: từ 100 đến DƯỚI 160
        ok("tâm thu 100 trong", st(ScreeningEvaluator.evaluate(r, "MALE", null, 100, null, null), "SYSTOLIC") == Status.WITHIN);
        ok("tâm thu 159 trong", st(ScreeningEvaluator.evaluate(r, "MALE", null, 159, null, null), "SYSTOLIC") == Status.WITHIN);
        ok("tâm thu 160 ngoài", st(ScreeningEvaluator.evaluate(r, "MALE", null, 160, null, null), "SYSTOLIC") == Status.OUTSIDE);
        ok("tâm thu 99 ngoài", st(ScreeningEvaluator.evaluate(r, "MALE", null, 99, null, null), "SYSTOLIC") == Status.OUTSIDE);
        // Cân nặng theo giới: 42 nữ / 45 nam / chưa khai báo dùng mức nghiêm hơn (45)
        ok("nữ 42kg trong", st(ScreeningEvaluator.evaluate(r, "FEMALE", null, null, null, 42.0), "WEIGHT") == Status.WITHIN);
        ok("nam 42kg ngoài", st(ScreeningEvaluator.evaluate(r, "MALE", null, null, null, 42.0), "WEIGHT") == Status.OUTSIDE);
        ok("chưa khai báo giới 44.9kg ngoài", st(ScreeningEvaluator.evaluate(r, "UNSPECIFIED", null, null, null, 44.9), "WEIGHT") == Status.OUTSIDE);
        // Không đo thì không bị coi là ngoài ngưỡng
        List<ScreeningEvaluator.Finding> none = ScreeningEvaluator.evaluate(r, "MALE", null, null, null, null);
        ok("không có số liệu thì không 'ngoài ngưỡng'", !ScreeningEvaluator.anyOutside(none) && none.stream().allMatch(f -> f.status() == Status.NOT_MEASURED));
        // Lời nhắn không chẩn đoán
        List<ScreeningEvaluator.Finding> bad = ScreeningEvaluator.evaluate(r, "MALE", 120, 180, 110, 40.0);
        ok("mọi chỉ số ngoài ngưỡng", bad.stream().allMatch(f -> f.status() == Status.OUTSIDE));
        ok("lời nhắn nhắc trao đổi với nhân viên y tế và nói rõ không phải chẩn đoán", bad.stream().allMatch(f -> f.note().contains("không phải chẩn đoán") && f.note().contains("nhân viên y tế")));
        String all = String.join(" ", bad.stream().map(ScreeningEvaluator.Finding::note).toList()).toLowerCase();
        ok("không dùng từ chẩn đoán bệnh", !all.contains("bị bệnh") && !all.contains("cao huyết áp") && !all.contains("tăng huyết áp") && !all.contains("nhịp nhanh"));
        ok("huyết áp tâm trương được đánh dấu 'tạm'", bad.stream().filter(f -> f.metric().equals("DIASTOLIC")).findFirst().get().provisional());
        // Giãn cách
        RejoinPolicy p = new RejoinPolicy(84, 84);
        LocalDate today = LocalDate.of(2026, 10, 14);
        ok("chưa từng hiến: được hiến", p.canDonate(null, "MALE", today) && p.daysRemaining(null, "MALE", today) == 0);
        ok("hiến đúng 84 ngày trước: được hiến", p.canDonate(today.minusDays(84), "MALE", today));
        ok("hiến 83 ngày trước: còn 1 ngày", !p.canDonate(today.minusDays(83), "MALE", today) && p.daysRemaining(today.minusDays(83), "MALE", today) == 1);
        ok("hiến hôm nay: còn 84 ngày", p.daysRemaining(today, "FEMALE", today) == 84);
        RejoinPolicy pf = new RejoinPolicy(84, 112);
        ok("quy tắc riêng cho nữ (112 ngày) không ảnh hưởng nam", pf.daysFor("FEMALE") == 112 && pf.daysFor("MALE") == 84 && pf.daysFor("UNSPECIFIED") == 84);
        ok("nữ hiến 90 ngày trước vẫn chưa được khi quy tắc 112", !pf.canDonate(today.minusDays(90), "FEMALE", today) && pf.canDonate(today.minusDays(90), "MALE", today));
        boolean threw = false; try { new RejoinPolicy(0, 84); } catch (IllegalArgumentException e) { threw = true; }
        ok("cấu hình không hợp lệ bị từ chối", threw);
        System.out.println("\n" + pass + " đạt, " + fail + " lỗi"); System.exit(fail == 0 ? 0 : 1);
    }
}
