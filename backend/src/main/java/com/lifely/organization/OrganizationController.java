package com.lifely.organization;

import com.lifely.auth.AuthUser;
import com.lifely.common.ApiResponse;
import com.lifely.common.PageResponse;
import com.lifely.organization.dto.*;
import com.lifely.request.RequestStatus;
import com.lifely.request.dto.RequestResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

@RestController
@RequestMapping("/api/organizations")
@Tag(name = "Organizations")
public class OrganizationController {

    private final OrganizationService service;

    public OrganizationController(OrganizationService service) {
        this.service = service;
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('ORGANIZATION')")
    public ApiResponse<OrganizationDto> me(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok("OK", service.getMine(user.getId()));
    }

    @PutMapping("/me")
    @PreAuthorize("hasRole('ORGANIZATION')")
    public ApiResponse<OrganizationDto> update(@AuthenticationPrincipal AuthUser user,
                                               @Valid @RequestBody UpdateOrganizationRequest req) {
        return ApiResponse.ok("Organization profile saved", service.upsert(user.getId(), req));
    }

    @PostMapping(value = "/me/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ORGANIZATION')")
    public ApiResponse<OrganizationDto> upload(@AuthenticationPrincipal AuthUser user,
                                               @RequestParam(defaultValue = "OTHER") String docType,
                                               @RequestParam("file") MultipartFile file) {
        return ApiResponse.ok("Document uploaded", service.addDocument(user.getId(), docType, file));
    }

    @PostMapping("/me/submit")
    @PreAuthorize("hasRole('ORGANIZATION')")
    public ApiResponse<OrganizationDto> submit(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok("Submitted for verification", service.submitForReview(user.getId()));
    }

    @GetMapping("/me/dashboard")
    @PreAuthorize("hasRole('ORGANIZATION')")
    public ApiResponse<OrganizationDashboard> dashboard(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok("OK", service.dashboard(user.getId()));
    }

    @GetMapping("/me/requests")
    @PreAuthorize("hasRole('ORGANIZATION')")
    public ApiResponse<PageResponse<RequestResponse>> requests(@AuthenticationPrincipal AuthUser user,
                                                               @RequestParam(required = false) RequestStatus status,
                                                               @RequestParam(defaultValue = "0") int page,
                                                               @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok("OK", service.listRequests(user.getId(), status, page, size));
    }

    @PostMapping("/me/requests/{id}/verify")
    @PreAuthorize("hasRole('ORGANIZATION')")
    public ApiResponse<RequestResponse> verifyRequest(@AuthenticationPrincipal AuthUser user, @PathVariable UUID id) {
        return ApiResponse.ok("Request verified", service.verifyLinkedRequest(user.getId(), id));
    }

    @GetMapping("/documents/{id}/download")
    @PreAuthorize("hasAnyRole('ORGANIZATION','ADMIN')")
    public ResponseEntity<Resource> download(@AuthenticationPrincipal AuthUser user, @PathVariable UUID id) {
        OrganizationService.DocumentFile f = service.download(user, id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(f.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(f.fileName(), StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .body(f.resource());
    }
}
