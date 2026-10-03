package com.lifely.common;

/** Regex dùng chung cho validation. */
public final class Patterns {

    public static final String BLOOD_TYPE = "^(A|B|AB|O)[+-]$";
    /** Số điện thoại Việt Nam: 0xxxxxxxxx hoặc +84xxxxxxxxx */
    public static final String PHONE = "^(0|\\+84)\\d{9,10}$";
    public static final String PASSWORD = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,72}$";

    private Patterns() {
    }
}
