package com.lifely.appointment;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Nhắc lịch hiến máu sắp tới (khoảng nhắc cấu hình bằng lifely.notify.appointment-reminder-hours). */
@Component
public class AppointmentReminderJob {

    private static final Logger log = LoggerFactory.getLogger(AppointmentReminderJob.class);

    private final AppointmentService service;

    public AppointmentReminderJob(AppointmentService service) {
        this.service = service;
    }

    @Scheduled(fixedDelayString = "${lifely.jobs.reminder-interval-ms:300000}", initialDelay = 60000)
    public void run() {
        try {
            int n = service.sendDueReminders();
            if (n > 0) {
                log.info("Đã nhắc {} lịch hiến máu", n);
            }
        } catch (Exception e) {
            log.error("Nhắc lịch lỗi", e);
        }
    }
}
