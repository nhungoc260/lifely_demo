package com.lifely.common;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GeoUtilsTest {

    @Test
    void samePointIsZero() {
        assertEquals(0.0, GeoUtils.haversineKm(10.7769, 106.7009, 10.7769, 106.7009), 1e-9);
    }

    @Test
    void districtOneToThuDucMatchesReferenceValue() {
        // Giá trị tham chiếu tính độc lập bằng Python: 9.9119 km
        assertEquals(9.9119, GeoUtils.haversineKm(10.7769, 106.7009, 10.8494, 106.7537), 0.001);
    }

    @Test
    void oneDegreeOfLatitudeIsAbout111Km() {
        assertEquals(111.2, GeoUtils.haversineKm(0, 0, 1, 0), 0.1);
    }

    @Test
    void isSymmetric() {
        assertEquals(GeoUtils.haversineKm(10.77, 106.70, 10.85, 106.75),
                GeoUtils.haversineKm(10.85, 106.75, 10.77, 106.70), 1e-9);
    }
}
