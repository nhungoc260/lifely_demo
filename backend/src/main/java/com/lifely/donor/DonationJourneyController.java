package com.lifely.donor;

import com.lifely.auth.AuthUser;
import com.lifely.common.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/donors/me/history")
@PreAuthorize("hasRole('DONOR')")
@Tag(name = "Donor")
public class DonationJourneyController {

    private final DonationJourneyService service;

    public DonationJourneyController(DonationJourneyService service) {
        this.service = service;
    }

    @GetMapping("/{id}/journey")
    public ApiResponse<DonationJourney> journey(@AuthenticationPrincipal AuthUser user, @PathVariable UUID id) {
        return ApiResponse.ok("OK", service.journey(user.getId(), id));
    }
}
