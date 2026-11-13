package com.lifely.fuel;

import com.lifely.admin.AdminAlerts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Giá xăng: tự lấy nhiều lần mỗi ngày (kỳ điều hành thường lúc 15h) và sau khi khởi động; nếu vẫn lâu chưa cập nhật
 * (nguồn lỗi) thì 8h10 sáng cảnh báo admin để kiểm tra nguồn. Không có nhập tay: giá hoàn toàn tự động.
 */
@Component
public class FuelPriceReminderJob {

    private static final Logger log = LoggerFactory.getLogger(FuelPriceReminderJob.class);

    private final FuelPriceService service;
    private final FuelPriceFetcher fetcher;
    private final AdminAlerts adminAlerts;

    public FuelPriceReminderJob(FuelPriceService service, FuelPriceFetcher fetcher, AdminAlerts adminAlerts) {
        this.service = service;
        this.fetcher = fetcher;
        this.adminAlerts = adminAlerts;
    }

    @Scheduled(cron = "${lifely.fuel.fetch-cron:0 0 7,15,16,17 * * *}", zone = "Asia/Ho_Chi_Minh")
    public void autoUpdate() {
        if (!fetcher.isEnabled()) {
            return;
        }
        FuelPriceFetcher.Result r = fetcher.fetchNow();
        log.info("Tự lấy giá xăng: ok={} price={} {}", r.ok(), r.priceVnd(), r.message());
        if (!r.ok() && r.priceVnd() != null) {
            adminAlerts.raise("Giá xăng lấy tự động bị lệch", r.message(), "FUEL_PRICE", null);
        }
    }

    /** Một lần sau khi khởi động (để giá luôn mới ngay cả khi máy chủ vừa ngủ dậy). */
    @Scheduled(initialDelay = 60_000, fixedDelay = Long.MAX_VALUE)
    public void onStartup() {
        autoUpdate();
    }

    @Scheduled(cron = "${lifely.fuel.reminder-cron:0 10 8 * * *}", zone = "Asia/Ho_Chi_Minh")
    public void remind() {
        try {
            FuelPriceService.Current c = service.current();
            if (c.stale()) {
                adminAlerts.raise("Giá xăng chưa được cập nhật",
                        "Giá xăng gần nhất là ngày " + c.effectiveDate() + " (" + c.ageDays() + " ngày trước), hệ thống chưa tự lấy được giá mới. "
                                + "Hãy kiểm tra nguồn dữ liệu giá xăng (trang công bố có thể đã đổi giao diện).", "FUEL_PRICE", null);
            }
        } catch (RuntimeException e) {
            log.warn("Không kiểm tra được giá xăng: {}", e.getClass().getSimpleName());
        }
    }
}
