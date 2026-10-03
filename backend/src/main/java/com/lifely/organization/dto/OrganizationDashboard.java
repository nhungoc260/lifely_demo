package com.lifely.organization.dto;

import com.lifely.organization.OrgVerificationStatus;

public record OrganizationDashboard(OrgVerificationStatus verificationStatus, long activeRequests,
                                    long criticalRequests, long completedRequests, double responseRate) {
}
