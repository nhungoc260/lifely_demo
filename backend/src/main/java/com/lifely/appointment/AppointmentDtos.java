package com.lifely.appointment;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

/** DTO của module lịch hiến máu (Luồng B). Không chứa số điện thoại hay dữ liệu y tế. */
public final class AppointmentDtos {

    private AppointmentDtos() {
    }

    public record SlotDto(UUID id, UUID organizationId, String organizationName, String address, String city,
                          Instant startsAt, Instant endsAt, int capacity, int bookedCount, int available, String status) {
    }

    public record AppointmentDto(UUID id, UUID slotId, UUID organizationId, String organizationName, String address,
                                 Instant startsAt, Instant endsAt, String status, boolean canCancel, Instant createdAt) {
    }

    /** Dành cho nhân viên cơ sở: tên và nhóm máu người hiến để tiếp nhận; không có số điện thoại. */
    public record OrgAppointmentDto(UUID id, UUID slotId, String donorName, String bloodType, String status,
                                    Instant startsAt, Instant handledAt, Instant createdAt) {
    }

    /** location: địa điểm hiến máu của khung giờ này; để trống = dùng địa chỉ trong hồ sơ cơ sở. */
    public record CreateSlotRequest(@NotNull Instant startsAt, @NotNull Instant endsAt,
                                    @Min(1) @Max(500) int capacity, @Size(max = 300) String location) {
        public CreateSlotRequest(Instant startsAt, Instant endsAt, int capacity) {
            this(startsAt, endsAt, capacity, null);
        }
    }

    /** allUpcoming=true: đổi cho mọi khung giờ sắp tới còn mở của cơ sở (ví dụ cơ sở chuyển địa điểm). */
    public record ChangeLocationRequest(@NotBlank @Size(min = 3, max = 300) String location, boolean allUpcoming) {
    }

    public record LocationChangeResult(SlotDto slot, int updatedSlots, int notifiedDonors) {
    }

    public enum Action { CHECK_IN, SCREEN_PASS, DEFER, NO_SHOW, DONATED }

    public record StatusRequest(@NotNull Action action) {
    }
}
