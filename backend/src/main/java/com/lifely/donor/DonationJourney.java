package com.lifely.donor;

import java.time.Instant;

/** Mốc "nhập kho" của một lần hiến: có khi cơ sở đã xác nhận hiến và kho đã tự cộng 1 đơn vị. */
public record DonationJourney(boolean addedToInventory, Instant addedAt, String organizationName) {
}
