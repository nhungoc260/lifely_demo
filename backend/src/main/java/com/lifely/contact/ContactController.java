package com.lifely.contact;

import com.lifely.auth.AuthUser;
import com.lifely.common.ApiResponse;
import com.lifely.common.AppException;
import com.lifely.common.PageResponse;
import com.lifely.mail.MailService;
import com.lifely.mail.SummaryReportService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@Tag(name = "Contact")
public class ContactController {

    public record StatusRequest(@NotNull ContactStatus status) {
    }

    private final ContactService service;
    private final SummaryReportService summaryReport;
    private final MailService mail;

    public ContactController(ContactService service, SummaryReportService summaryReport, MailService mail) {
        this.service = service;
        this.summaryReport = summaryReport;
        this.mail = mail;
    }

    /** Công khai: khách hoặc thành viên đều gửi được. Có giới hạn tần suất theo IP. */
    @PostMapping("/api/public/contact")
    public ResponseEntity<ApiResponse<Void>> submit(@Valid @RequestBody ContactRequest req,
                                                    @AuthenticationPrincipal AuthUser user) {
        service.submit(req, user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Thank you. Our team will get back to you soon", null));
    }

    @GetMapping("/api/admin/messages")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PageResponse<ContactMessageDto>> list(@RequestParam(required = false) ContactStatus status,
                                                             @RequestParam(defaultValue = "0") int page,
                                                             @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok("OK", service.list(status, page, size));
    }

    @PutMapping("/api/admin/messages/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<ContactMessageDto> update(@AuthenticationPrincipal AuthUser admin, @PathVariable UUID id,
                                                 @Valid @RequestBody StatusRequest req) {
        return ApiResponse.ok("Message updated", service.updateStatus(admin.getId(), id, req.status()));
    }

    @PostMapping("/api/admin/summary/email")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> emailSummary() {
        if (!mail.isEnabled() || !mail.hasAdminRecipient()) {
            throw AppException.conflict("MAIL_DISABLED",
                    "Email is not configured. Set MAIL_ENABLED, MAIL_USERNAME, MAIL_PASSWORD and ADMIN_NOTIFY_EMAIL.");
        }
        summaryReport.sendNow();
        return ApiResponse.ok("The summary report is on its way to the admin mailbox", null);
    }
}
