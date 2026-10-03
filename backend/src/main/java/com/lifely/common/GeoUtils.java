package com.lifely.common;

/** Tiện ích địa lý: công thức Haversine (đặc tả mục 57). */
public final class GeoUtils {

    private static final double EARTH_RADIUS_KM = 6371.0088;

    private GeoUtils() {
    }

    /** Khoảng cách đại cầu giữa hai tọa độ, đơn vị km. */
    public static double haversineKm(double donorLatitude, double donorLongitude,
                                     double requestLatitude, double requestLongitude) {
        double dLat = Math.toRadians(requestLatitude - donorLatitude);
        double dLon = Math.toRadians(requestLongitude - donorLongitude);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(donorLatitude)) * Math.cos(Math.toRadians(requestLatitude))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    public static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
