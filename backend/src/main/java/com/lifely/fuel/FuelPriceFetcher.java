package com.lifely.fuel;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.OptionalInt;

/**
 * Tự lấy giá xăng E10 RON 95 Mức 3 (RON 95-III) Vùng 1 từ các trang công bố giá, hoàn toàn tự động, không cần nhập tay.
 * Đọc ĐỒNG THỜI nhiều nguồn (lifely.fuel.source-urls, theo thứ tự ưu tiên) rồi đối chiếu: chỉ ghi khi các nguồn khớp nhau.
 * An toàn theo thiết kế: một nguồn lỗi thì dùng nguồn còn lại; tất cả lỗi thì giữ giá gần nhất (giao diện báo "giá cũ", admin được nhắc);
 * giá lấy được lệch quá max-jump-pct so với giá hiện tại thì không tự ghi mà báo admin. Nguồn chỉ lấy từ cấu hình hệ thống.
 */
@Component
public class FuelPriceFetcher {

    private static final Logger log = LoggerFactory.getLogger(FuelPriceFetcher.class);
    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final int MAX_BODY_CHARS = 3_000_000;

    /** ok = đã ghi giá; priceVnd có thể khác null kể cả khi ok = false (giá lấy được nhưng bị từ chối). */
    public record Result(boolean ok, Integer priceVnd, String message) {
    }

    private final FuelPriceService service;
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8)).followRedirects(HttpClient.Redirect.NORMAL).build();

    @Value("${lifely.fuel.source-urls:https://www.momo.vn/tien-ich-giao-thong/gia-xang,https://www.petrolimex.com.vn/}")
    private String sourceUrls;

    @Value("${lifely.fuel.auto-enabled:true}")
    private boolean enabled;

    @Value("${lifely.fuel.max-jump-pct:20}")
    private int maxJumpPct;

    @Value("${lifely.fuel.source-tolerance-pct:3}")
    private int tolerancePct;

    public FuelPriceFetcher(FuelPriceService service) {
        this.service = service;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public Result fetchNow() {
        if (!enabled) {
            return new Result(false, null, "Tự động lấy giá xăng đang tắt");
        }
        List<Integer> prices = new ArrayList<>();
        List<String> hosts = new ArrayList<>();
        String lastError = "Chưa cấu hình nguồn giá xăng";
        for (String raw : sourceUrls.split(",")) {
            String url = raw.trim();
            if (url.isEmpty()) {
                continue;
            }
            try {
                String host = URI.create(url).getHost();
                HttpRequest req = HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(12))
                        .header("User-Agent", "LIFELY-fuel-price/1.0 (blood donation coordination demo)")
                        .header("Accept", "text/html,application/xhtml+xml,application/json").GET().build();
                HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
                if (res.statusCode() != 200) {
                    lastError = host + ": HTTP " + res.statusCode();
                    continue;
                }
                String body = res.body() == null ? "" : res.body();
                if (body.length() > MAX_BODY_CHARS) {
                    body = body.substring(0, MAX_BODY_CHARS);
                }
                OptionalInt price = FuelPriceParser.region1Price(body);
                if (price.isEmpty()) {
                    lastError = host + ": không thấy dòng xăng E10 RON 95-III (trang có thể đã đổi giao diện hoặc tải giá bằng JavaScript)";
                    continue;
                }
                prices.add(price.getAsInt());
                hosts.add(host);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return new Result(false, null, "Bị ngắt khi lấy giá xăng");
            } catch (IOException | RuntimeException e) {
                lastError = "Không lấy được giá xăng: " + e.getClass().getSimpleName();
                log.warn("Lấy giá xăng từ {} lỗi: {}", url, e.getClass().getSimpleName());
            }
        }

        FuelPriceConsensus.Decision d = FuelPriceConsensus.decide(prices, tolerancePct);
        if (d.outcome() == FuelPriceConsensus.Outcome.NONE) {
            return new Result(false, null, lastError);
        }
        if (d.outcome() == FuelPriceConsensus.Outcome.CONFLICT) {
            return new Result(false, d.priceVnd(), d.note());
        }
        int p = d.priceVnd();
        int prev = previousPrice();
        if (prev > 0 && Math.abs((long) p - prev) * 100 > (long) prev * maxJumpPct) {
            return new Result(false, p, "Giá lấy được " + p + "đ lệch quá " + maxJumpPct + "% so với giá hiện tại " + prev
                    + "đ nên chưa tự ghi");
        }
        service.saveAuto(LocalDate.now(VN), p, "Tự động từ " + String.join(", ", hosts));
        return new Result(true, p, "Đã cập nhật " + p + "đ/lít (" + d.note() + ": " + String.join(", ", hosts) + ")");
    }

    private int previousPrice() {
        try {
            return service.current().priceVnd();
        } catch (RuntimeException e) {
            return 0;
        }
    }
}
