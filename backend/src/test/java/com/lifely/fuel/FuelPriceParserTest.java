package com.lifely.fuel;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Đọc giá xăng E10 RON 95 Mức 3 Vùng 1 từ bảng giá Petrolimex: đúng mặt hàng, chịu được HTML, không lấy nhầm Mức 5. */
class FuelPriceParserTest {

    @Test
    void readsLevel3Region1NotLevel5() {
        String nov12 = "Xăng E10 RON 95 Mức 5 Đồng/lít 21.840 22.270 Xăng E10 RON 95 Mức 3 Đồng/lít 19.840 20.230 "
                + "Xăng E5 RON 92 Mức 2 Đồng/lít 19.390 19.770";
        assertEquals(19840, FuelPriceParser.region1Price(nov12).orElse(-1));
    }

    @Test
    void readsHtmlTableIgnoringScriptsAndEntities() {
        String html = "<table><tr><td>Xăng E10 RON 95 Mức 5</td><td>22.650</td><td>23.100</td></tr>"
                + "<tr><td>Xăng E10 RON 95 Mức&nbsp;3</td><td>Đồng/lít</td><td><b>21.150</b></td><td>21.570</td></tr></table>"
                + "<script>var x='E10 RON 95 Mức 3 99.999';</script>";
        assertEquals(21150, FuelPriceParser.region1Price(html).orElse(-1));
    }

    @Test
    void readsMomoTableWithChangeColumnBetweenNameAndPrice() {
        String html = "<tr><td>Xăng E10 RON 95-III<br><span>Giảm −1.310</span></td><td>19.840</td><td>Giảm −1.310</td></tr>"
                + "<tr><td>Xăng E5 RON 92-II<br><span>Giảm −1.500</span></td><td>19.390</td><td>Giảm −1.500</td></tr>"
                + "<tr><td>Xăng E10 RON 95-V<br><span>Giảm −810</span></td><td>21.840</td><td>Giảm −810</td></tr>";
        assertEquals(19840, FuelPriceParser.region1Price(html).orElse(-1));
    }

    @Test
    void neverBorrowsThePriceOfTheNextProductRow() {
        assertTrue(FuelPriceParser.region1Price("Xăng E10 RON 95 Mức 3 Đồng/lít Xăng E5 RON 92 Mức 2 Đồng/lít 19.390 19.770").isEmpty());
    }

    @Test
    void readsOldNaming() {
        assertEquals(22360, FuelPriceParser.region1Price("Xăng sinh học E10 RON 95-III Đồng/lít 22.360 22.800").orElse(-1));
    }

    @Test
    void doesNotFallBackToLevel5WhenLevel3IsMissing() {
        assertTrue(FuelPriceParser.region1Price("Xăng E10 RON 95 Mức 5 Đồng/lít 22.650 23.100").isEmpty());
    }

    @Test
    void rejectsMissingNullAndImplausiblePrices() {
        assertTrue(FuelPriceParser.region1Price("Trang không có bảng giá").isEmpty());
        assertTrue(FuelPriceParser.region1Price(null).isEmpty());
        assertTrue(FuelPriceParser.region1Price("Xăng E10 RON 95 Mức 3 Đồng/lít 05.000 06.000").isEmpty());
    }
}
