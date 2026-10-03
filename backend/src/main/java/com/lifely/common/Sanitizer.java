package com.lifely.common;

/** Làm sạch văn bản người dùng nhập: bỏ thẻ HTML và ký tự điều khiển (lớp phòng thủ XSS thứ hai; React vẫn tự escape). */
public final class Sanitizer {

    private Sanitizer() {
    }

    public static String plain(String input) {
        if (input == null) {
            return null;
        }
        String s = input.replaceAll("<[^>]*>", "").replaceAll("[\\p{Cntrl}&&[^\\n\\t]]", "").trim();
        return s.isEmpty() ? null : s;
    }
}
