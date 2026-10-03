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

    public static List<String> compatibleDonorTypes(String recipient) {
        return ALL.stream().filter(d -> canDonate(d, recipient)).toList();
    }

    private static String abo(String code) {
        return code.substring(0, code.length() - 1);
    }
}
