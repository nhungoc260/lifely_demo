package com.lifely.realtime;

import java.time.Instant;
import java.util.UUID;

/** Gửi tới /topic/requests/{id} sau khi transaction commit để requester thấy cập nhật mà không cần reload. */
public record RequestChangedEvent(UUID requestId, int unitsConfirmed, int unitsRequired, String status,
                                  Instant at) {
}
