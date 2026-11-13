package com.lifely.fuel;

import com.lifely.common.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@Tag(name = "Fuel price")
public class FuelPriceController {

    private final FuelPriceService service;
    private final FuelPriceFetcher fetcher;

    public FuelPriceController(FuelPriceService service, FuelPriceFetcher fetcher) {
        this.service = service;
        this.fetcher = fetcher;
    }

    /** Giá xăng hiện hành (công khai): dùng để ước tính chi phí đi lại. */
    @GetMapping("/api/public/fuel-price")
    public ApiResponse<FuelPriceService.Current> current() {
        return ApiResponse.ok("OK", service.current());
    }

    @GetMapping("/api/admin/fuel-prices")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<FuelPriceService.Entry>> history(@RequestParam(defaultValue = "14") int limit) {
        return ApiResponse.ok("OK", service.history(limit));
    }

    /** Admin bấm thử lấy giá tự động ngay (kiểm tra nguồn còn đọc được không). */
    @PostMapping("/api/admin/fuel-prices/fetch-now")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<FuelPriceFetcher.Result> fetchNow() {
        FuelPriceFetcher.Result r = fetcher.fetchNow();
        return ApiResponse.ok(r.message(), r);
    }
}
