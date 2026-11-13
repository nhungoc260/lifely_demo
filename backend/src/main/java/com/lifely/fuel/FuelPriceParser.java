package com.lifely.fuel;

import java.util.OptionalInt;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Đọc giá xăng E10 RON 95 Mức 3 (RON 95-III), Vùng 1 từ nội dung trang công bố giá của Petrolimex.
 * Thuần hàm, không đụng mạng: chịu được cả HTML lẫn văn bản thuần, cả tên gọi mới ("E10 RON 95 Mức 3") lẫn cũ
 * ("E10 RON 95-III"). Cố ý KHÔNG khớp dòng "Mức 5" (RON 95-V, đắt hơn) để không lấy nhầm mặt hàng.
 */
public final class FuelPriceParser {

    public static final int MIN_PRICE = 10_000;
    public static final int MAX_PRICE = 60_000;

    /**
     * Tên mặt hàng "E10 RON 95 Mức 3" hoặc "E10 RON 95-III", rồi tối đa 70 ký tự chưa chạm tên mặt hàng khác
     * (cho phép chen chữ như "Đồng/lít" hay "Giảm −1.310" của cột thay đổi), rồi giá 2 chữ số + nghìn: giá Vùng 1 đứng trước Vùng 2.
     */
    private static final Pattern ROW = Pattern.compile(
            "E10\\s*RON\\s*95\\s*(?:-\\s*III|M[ứuÚU]c\\s*3)"
                    + "(?:(?!RON|E5|E10|Đi[êe]zen|Diesel|Dầu|DO\\s).){0,70}?"
                    + "(?<![\\d.,])(\\d{2}[.,]\\d{3})(?!\\d)",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    private FuelPriceParser() {
    }

    public static String toText(String html) {
        if (html == null) {
            return "";
        }
        return html
                .replaceAll("(?is)<script.*?</script>|<style.*?</style>", " ")
                .replaceAll("(?s)<[^>]+>", " ")
                .replace("&nbsp;", " ")
                .replaceAll("\\s+", " ");
    }

    /** Giá Vùng 1 (đồng/lít) hoặc rỗng nếu không tìm thấy hoặc ngoài khoảng hợp lý. */
    public static OptionalInt region1Price(String htmlOrText) {
        Matcher m = ROW.matcher(toText(htmlOrText));
        while (m.find()) {
            int price = Integer.parseInt(m.group(1).replace(".", "").replace(",", ""));
            if (price >= MIN_PRICE && price <= MAX_PRICE) {
                return OptionalInt.of(price);
            }
        }
        return OptionalInt.empty();
    }
}
