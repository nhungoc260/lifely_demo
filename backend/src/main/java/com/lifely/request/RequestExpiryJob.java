package com.lifely.request;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class RequestExpiryJob {

    private static final Logger log = LoggerFactory.getLogger(RequestExpiryJob.class);

    private final BloodRequestRepository requestRepository;
    private final RequestExpiryService expiryService;

    public RequestExpiryJob(BloodRequestRepository requestRepository, RequestExpiryService expiryService) {
        this.requestRepository = requestRepository;
        this.expiryService = expiryService;
    }

    @Scheduled(fixedDelayString = "${lifely.jobs.expiry-interval-ms:60000}", initialDelay = 20000)
    public void run() {
        for (BloodRequest r : requestRepository.findByStatusInAndDeadlineBefore(
                RequestStatus.AWAITING_OR_ACTIVE, Instant.now())) {
            try {
                expiryService.expire(r.getId());
            } catch (Exception e) {
                log.error("Failed to expire request {}", r.getId(), e);
            }
        }
    }
}
