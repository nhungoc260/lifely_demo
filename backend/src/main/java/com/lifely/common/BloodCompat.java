package com.lifely.common;

import java.util.List;

/**
 * Quy tắc tương thích hồng cầu ABO + Rh, chỉ dùng để xếp hạng điều phối.
 * KHÔNG phải quyết định y tế: bệnh viện luôn là bên quyết định cuối cùng.
 */
public final class BloodCompat {

    public static final List<String> ALL = List.of("O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-");

    private BloodCompat() {
    }

    public static boolean canDonate(String donor, String recipient) {
        String d = abo(donor);
        String r = abo(recipient);
        boolean aboOk = switch (d) {
            case "O" -> true;
            case "A" -> r.equals("A") || r.equals("AB");
            case "B" -> r.equals("B") || r.equals("AB");
            default -> r.equals("AB");
        };
        boolean rhOk = !donor.endsWith("+") || recipient.endsWith("+");
        return aboOk && rhOk;
    }

    /** Số nhóm máu người nhận mà nhóm này có thể hiến: O- = 8 (đa năng), AB+ = 1. */
    public static int recipientCount(String donor) {
        return (int) ALL.stream().filter(r -> canDonate(donor, r)).count();
    }

    /**
     * Điểm tương thích hồng cầu 0-100 để xếp hạng điều phối (KHÔNG phải quyết định y tế).
     * Đúng nhóm = 100. Khác nhóm nhưng tương thích: 90 trừ dần theo "độ đa năng" của người hiến,
     * để nhóm đa năng/hiếm (O-, rồi O+, A-, B-) chỉ được gọi khi chưa đủ người đúng nhóm:
     * O- = 65, nhóm hiến được 4 loại = 79, nhóm hiến được 2 loại = 86. Không tương thích = 0.
     */
    public static double compatibilityScore(String donor, String recipient) {
        if (donor.equals(recipient)) {
            return 100.0;
        }
        if (!canDonate(donor, recipient)) {
            return 0.0;
        }
        int serves = recipientCount(donor);
        return 90.0 - 25.0 * (serves - 1) / (ALL.size() - 1);
    }

    public static List<String> compatibleDonorTypes(String recipient) {
        return ALL.stream().filter(d -> canDonate(d, recipient)).toList();
    }

    private static String abo(String code) {
        return code.substring(0, code.length() - 1);
    }
}
