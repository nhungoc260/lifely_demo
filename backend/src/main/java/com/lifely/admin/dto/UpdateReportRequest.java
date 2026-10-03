package com.lifely.admin.dto;

import com.lifely.report.ReportStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateReportRequest(@NotNull ReportStatus status) {
}
