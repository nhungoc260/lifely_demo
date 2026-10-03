package com.lifely.report;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.UUID;

public interface ReportRepository extends JpaRepository<Report, UUID>, JpaSpecificationExecutor<Report> {

    boolean existsByReporterIdAndTargetTypeAndTargetIdAndStatusIn(UUID reporterId, ReportTarget type, UUID targetId,
                                                                  java.util.Collection<ReportStatus> statuses);
}
