package com.lifely.fuel;

import java.util.List;

/**
 * Quyết định giá xăng từ nhiều nguồn độc lập. Một nguồn: nhận (có kiểm tra độ lệch với giá cũ ở nơi gọi).
 * Từ hai nguồn: chỉ nhận khi các nguồn khớp nhau trong ngưỡng cho phép; lệch nhiều thì không tự ghi vì chưa biết nguồn nào đúng.
 */
public final class FuelPriceConsensus {

    public enum Outcome { NONE, ACCEPT, CONFLICT }

    public record Decision(Outcome outcome, int priceVnd, String note) {
    }

    private FuelPriceConsensus() {
    }

    /** prices theo thứ tự ưu tiên của nguồn; trả về giá của nguồn ưu tiên nhất khi các nguồn khớp nhau. */
    public static Decision decide(List<Integer> prices, int tolerancePct) {
        if (prices == null || prices.isEmpty()) {
            return new Decision(Outcome.NONE, 0, "Không nguồn nào đọc được giá");
        }
        if (prices.size() == 1) {
            return new Decision(Outcome.ACCEPT, prices.get(0), "1 nguồn");
        }
        int min = prices.stream().mapToInt(Integer::intValue).min().getAsInt();
        int max = prices.stream().mapToInt(Integer::intValue).max().getAsInt();
        if ((long) (max - min) * 100 <= (long) min * tolerancePct) {
            return new Decision(Outcome.ACCEPT, prices.get(0), prices.size() + " nguồn khớp nhau");
        }
        return new Decision(Outcome.CONFLICT, prices.get(0),
                "Các nguồn lệch nhau (" + min + " đến " + max + "đ), chưa tự ghi");
    }
}
