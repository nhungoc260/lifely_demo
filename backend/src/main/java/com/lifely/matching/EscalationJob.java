package com.lifely.matching;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.UUID;

/** Leo thang theo cấp 1 -> 4, không gửi cho toàn bộ donor cùng lúc (đặc tả mục 58). */
@Component
public class EscalationJob {

    private static final Logger log = LoggerFactory.getLogger(EscalationJob.class);

    private final MatchingService matchingService;

    public EscalationJob(MatchingService matchingService) {
        this.matchingService = matchingService;
    }

    @Scheduled(fixedDelayString = "${lifely.jobs.escalation-interval-ms:30000}", initialDelay = 25000)
    public void run() {
        for (UUID id : matchingService.findEscalationDue()) {
            try {
                matchingService.escalate(id);
            } catch (Exception e) {
                log.error("Escalation failed for request {}", id, e);
            }
        }
    }
}
