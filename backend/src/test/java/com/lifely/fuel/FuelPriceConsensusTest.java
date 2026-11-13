package com.lifely.fuel;

import com.lifely.fuel.FuelPriceConsensus.Outcome;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** Đối chiếu nhiều nguồn giá xăng: khớp thì nhận, lệch nhiều thì không tự ghi. */
class FuelPriceConsensusTest {

    @Test
    void noSourceMeansNothing() {
        assertEquals(Outcome.NONE, FuelPriceConsensus.decide(List.of(), 3).outcome());
    }

    @Test
    void singleSourceIsAccepted() {
        assertEquals(Outcome.ACCEPT, FuelPriceConsensus.decide(List.of(19840), 3).outcome());
    }

    @Test
    void agreeingSourcesAcceptPrimaryPrice() {
        FuelPriceConsensus.Decision d = FuelPriceConsensus.decide(List.of(19840, 20230), 3);
        assertEquals(Outcome.ACCEPT, d.outcome());
        assertEquals(19840, d.priceVnd());
    }

    @Test
    void conflictingSourcesAreNotWritten() {
        assertEquals(Outcome.CONFLICT, FuelPriceConsensus.decide(List.of(19840, 24910), 3).outcome());
    }
}
