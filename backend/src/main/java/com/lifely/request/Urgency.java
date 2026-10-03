package com.lifely.request;

public enum Urgency {
    CRITICAL(0), URGENT(1), NORMAL(2);

    private final int rank;

    Urgency(int rank) {
        this.rank = rank;
    }

    public int rank() {
        return rank;
    }
}
