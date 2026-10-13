package com.lifely.inventory;

import java.time.Instant;
import java.util.List;

/** Một dòng kho máu: số đơn vị của một nhóm máu và cờ cảnh báo sắp hết. */
public record InventoryItem(String bloodType, int units, int lowThreshold, boolean low, Instant updatedAt) {

    public static final int DEFAULT_THRESHOLD = 5;

    /** Thứ tự hiển thị cố định của 8 nhóm máu. */
    public static final List<String> BLOOD_TYPES = List.of("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-");

    /** Sắp hết khi số đơn vị không vượt quá ngưỡng cảnh báo (kể cả hết sạch). */
    public static boolean isLow(int units, int lowThreshold) {
        return units <= lowThreshold;
    }

    public static InventoryItem of(String bloodType, int units, int lowThreshold, Instant updatedAt) {
        return new InventoryItem(bloodType, units, lowThreshold, isLow(units, lowThreshold), updatedAt);
    }
}
