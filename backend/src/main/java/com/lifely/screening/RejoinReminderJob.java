package com.lifely.screening;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;

@Component
public class RejoinReminderJob {

    private static final Logger log = LoggerFactory.getLogger(RejoinReminderJob.class);

    private final RejoinReminderService service;

    public RejoinReminderJob(RejoinReminderService service) {
        this.service = service;
    }

    @Scheduled(fixedDelayString = "${lifely.jobs.rejoin-interval-ms:3600000}", initialDelayString = "${lifely.jobs.rejoin-initial-delay-ms:90000}")
    public void run() {
        try {
            int n = service.sendDue(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")));
            if (n > 0) {
                log.info("Đã nhắc {} người hiến có thể hiến lại", n);
            }
        } catch (Exception e) {
            log.error("Nhắc hiến lại lỗi", e);
        }
    }
}
