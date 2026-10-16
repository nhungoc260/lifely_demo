package com.lifely.screening;

import com.lifely.screening.ScreeningEvaluator.Finding;
import com.lifely.screening.ScreeningEvaluator.Status;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/** Ngưỡng sàng lọc sơ bộ và giãn cách: biên đúng, không chẩn đoán, không coi "chưa đo" là "ngoài ngưỡng". */
class ScreeningEvaluatorTest {

    private final ScreeningRules rules = ScreeningRules.defaults();

    private Status status(List<Finding> f, String metric) {
        return f.stream().filter(x -> x.metric().equals(metric)).findFirst().orElseThrow().status();
    }

    @Test
    void heartRateBoundariesAreInclusive() {
        for (int hr : new int[]{60, 75, 90}) {
            assertEquals(Status.WITHIN, status(ScreeningEvaluator.evaluate(rules, "MALE", hr, null, null, null), "HEART_RATE"));
        }
        for (int hr : new int[]{59, 91}) {
            assertEquals(Status.OUTSIDE, status(ScreeningEvaluator.evaluate(rules, "MALE", hr, null, null, null), "HEART_RATE"));
        }
    }

    @Test
    void systolicIsFrom100ToBelow160() {
        assertEquals(Status.WITHIN, status(ScreeningEvaluator.evaluate(rules, "MALE", null, 100, null, null), "SYSTOLIC"));
        assertEquals(Status.WITHIN, status(ScreeningEvaluator.evaluate(rules, "MALE", null, 159, null, null), "SYSTOLIC"));
        assertEquals(Status.OUTSIDE, status(ScreeningEvaluator.evaluate(rules, "MALE", null, 160, null, null), "SYSTOLIC"));
        assertEquals(Status.OUTSIDE, status(ScreeningEvaluator.evaluate(rules, "MALE", null, 99, null, null), "SYSTOLIC"));
    }

    @Test
    void weightMinimumDependsOnGender() {
        assertEquals(Status.WITHIN, status(ScreeningEvaluator.evaluate(rules, "FEMALE", null, null, null, 42.0), "WEIGHT"));
        assertEquals(Status.OUTSIDE, status(ScreeningEvaluator.evaluate(rules, "MALE", null, null, null, 42.0), "WEIGHT"));
        assertEquals(Status.OUTSIDE, status(ScreeningEvaluator.evaluate(rules, "UNSPECIFIED", null, null, null, 44.9), "WEIGHT"));
    }

    @Test
    void notMeasuredIsNeverOutside() {
        List<Finding> f = ScreeningEvaluator.evaluate(rules, "MALE", null, null, null, null);
        assertFalse(ScreeningEvaluator.anyOutside(f));
        assertTrue(f.stream().allMatch(x -> x.status() == Status.NOT_MEASURED));
    }

    @Test
    void messagesAreNotDiagnoses() {
        List<Finding> f = ScreeningEvaluator.evaluate(rules, "MALE", 120, 180, 110, 40.0);
        assertTrue(f.stream().allMatch(x -> x.note().contains("không phải chẩn đoán") && x.note().contains("nhân viên y tế")));
        String all = String.join(" ", f.stream().map(Finding::note).toList()).toLowerCase();
        assertFalse(all.contains("cao huyết áp") || all.contains("tăng huyết áp") || all.contains("bị bệnh"));
        assertTrue(f.stream().filter(x -> x.metric().equals("DIASTOLIC")).findFirst().orElseThrow().provisional());
        assertTrue(ScreeningEvaluator.DISCLAIMER.contains("không thay thế tư vấn y tế"));
    }

    @Test
    void rejoinIntervalAndFemaleOverride() {
        LocalDate today = LocalDate.of(2026, 10, 14);
        RejoinPolicy p = new RejoinPolicy(84, 84);
        assertTrue(p.canDonate(null, "MALE", today));
        assertTrue(p.canDonate(today.minusDays(84), "MALE", today));
        assertFalse(p.canDonate(today.minusDays(83), "MALE", today));
        assertEquals(1, p.daysRemaining(today.minusDays(83), "MALE", today));
        assertEquals(84, p.daysRemaining(today, "FEMALE", today));
        RejoinPolicy pf = new RejoinPolicy(84, 112);
        assertEquals(112, pf.daysFor("FEMALE"));
        assertEquals(84, pf.daysFor("MALE"));
        assertFalse(pf.canDonate(today.minusDays(90), "FEMALE", today));
        assertTrue(pf.canDonate(today.minusDays(90), "MALE", today));
        assertThrows(IllegalArgumentException.class, () -> new RejoinPolicy(0, 84));
    }
}
