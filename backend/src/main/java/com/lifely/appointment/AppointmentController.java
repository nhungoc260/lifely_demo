package com.lifely.appointment;

import com.lifely.appointment.AppointmentDtos.AppointmentDto;
import com.lifely.appointment.AppointmentDtos.ChangeLocationRequest;
import com.lifely.appointment.AppointmentDtos.CreateSlotRequest;
import com.lifely.appointment.AppointmentDtos.LocationChangeResult;
import com.lifely.appointment.AppointmentDtos.OrgAppointmentDto;
import com.lifely.appointment.AppointmentDtos.SlotDto;
import com.lifely.appointment.AppointmentDtos.StatusRequest;
import com.lifely.auth.AuthUser;
import com.lifely.common.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@Tag(name = "Donation appointments")
public class AppointmentController {

    private final AppointmentService service;

    public AppointmentController(AppointmentService service) {
        this.service = service;
    }

    // ---- người hiến
    @GetMapping("/api/slots")
    @PreAuthorize("hasRole('DONOR')")
    public ApiResponse<List<SlotDto>> slots(@RequestParam(required = false) UUID organizationId,
                                            @RequestParam(defaultValue = "30") int days) {
        return ApiResponse.ok("OK", service.openSlots(organizationId, days));
    }

    @PostMapping("/api/slots/{id}/book")
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<ApiResponse<AppointmentDto>> book(@AuthenticationPrincipal AuthUser user, @PathVariable UUID id) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Đã đặt lịch hiến máu", service.book(user, id)));
    }

    @GetMapping("/api/appointments/mine")
    @PreAuthorize("hasRole('DONOR')")
    public ApiResponse<List<AppointmentDto>> mine(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok("OK", service.mine(user));
    }

    @PostMapping("/api/appointments/{id}/cancel")
    @PreAuthorize("hasRole('DONOR')")
    public ApiResponse<AppointmentDto> cancel(@AuthenticationPrincipal AuthUser user, @PathVariable UUID id) {
        return ApiResponse.ok("Đã hủy lịch hẹn", service.cancel(user, id));
    }

    // ---- nhân viên cơ sở y tế
    @PostMapping("/api/organizations/me/slots")
    @PreAuthorize("hasRole('ORGANIZATION')")
    public ResponseEntity<ApiResponse<SlotDto>> createSlot(@AuthenticationPrincipal AuthUser user,
                                                           @Valid @RequestBody CreateSlotRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Đã mở khung giờ", service.createSlot(user, req)));
    }

    @GetMapping("/api/organizations/me/slots")
    @PreAuthorize("hasRole('ORGANIZATION')")
    public ApiResponse<List<SlotDto>> orgSlots(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok("OK", service.orgSlots(user));
    }

    @PostMapping("/api/organizations/me/slots/{id}/close")
    @PreAuthorize("hasRole('ORGANIZATION')")
    public ApiResponse<SlotDto> closeSlot(@AuthenticationPrincipal AuthUser user, @PathVariable UUID id) {
        return ApiResponse.ok("Đã đóng khung giờ", service.closeSlot(user, id));
    }

    /** Đổi địa điểm hiến máu của một khung giờ (hoặc mọi khung giờ sắp tới); người đã đặt lịch được thông báo. */
    @PostMapping("/api/organizations/me/slots/{id}/location")
    @PreAuthorize("hasRole('ORGANIZATION')")
    public ApiResponse<LocationChangeResult> changeLocation(@AuthenticationPrincipal AuthUser user, @PathVariable UUID id,
                                                            @Valid @RequestBody ChangeLocationRequest req) {
        return ApiResponse.ok("Đã đổi địa điểm hiến máu", service.changeLocation(user, id, req));
    }

    @GetMapping("/api/organizations/me/slots/{id}/appointments")
    @PreAuthorize("hasRole('ORGANIZATION')")
    public ApiResponse<List<OrgAppointmentDto>> orgAppointments(@AuthenticationPrincipal AuthUser user, @PathVariable UUID id) {
        return ApiResponse.ok("OK", service.orgAppointments(user, id));
    }

    @PostMapping("/api/organizations/me/appointments/{id}/status")
    @PreAuthorize("hasRole('ORGANIZATION')")
    public ApiResponse<OrgAppointmentDto> transition(@AuthenticationPrincipal AuthUser user, @PathVariable UUID id,
                                                     @Valid @RequestBody StatusRequest req) {
        return ApiResponse.ok("Đã cập nhật lịch hẹn", service.transition(user, id, req.action()));
    }
}
