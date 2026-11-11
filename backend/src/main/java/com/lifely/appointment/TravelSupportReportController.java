package com.lifely.appointment;

import com.lifely.common.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Travel support report")
public class TravelSupportReportController {

    private final TravelSupportReportService service;

    public TravelSupportReportController(TravelSupportReportService service) {
        this.service = service;
    }

    @GetMapping("/api/admin/travel-support")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<TravelSupportReportService.Report> report() {
        return ApiResponse.ok("OK", service.report());
    }
}
