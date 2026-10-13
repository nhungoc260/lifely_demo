package com.lifely.inventory;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class InventoryItemTest {

    @Test
    void isLowWhenUnitsAreAtOrBelowTheThreshold() {
        assertTrue(InventoryItem.isLow(0, 5));
        assertTrue(InventoryItem.isLow(5, 5));
        assertFalse(InventoryItem.isLow(6, 5));
    }

    @Test
    void ofSetsTheLowFlagFromUnitsAndThreshold() {
        assertTrue(InventoryItem.of("O-", 2, 5, null).low());
        assertFalse(InventoryItem.of("O-", 20, 5, null).low());
    }

    @Test
    void allEightBloodTypesAreListedOnce() {
        assertEquals(8, InventoryItem.BLOOD_TYPES.size());
        assertEquals(8, InventoryItem.BLOOD_TYPES.stream().distinct().count());
    }
}
