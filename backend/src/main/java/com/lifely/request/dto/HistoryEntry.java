package com.lifely.request.dto;

import com.lifely.request.RequestStatus;
import com.lifely.request.RequestStatusHistory;

import java.time.Instant;

public record HistoryEntry(RequestStatus fromStatus, RequestStatus toStatus, String note, Instant createdAt) {

    public static HistoryEntry from(RequestStatusHistory h) {
        return new HistoryEntry(h.getFromStatus(), h.getToStatus(), h.getNote(), h.getCreatedAt());
    }
}
