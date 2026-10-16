package com.lifely.appointment;

import com.lifely.appointment.AppointmentDtos.Action;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/** Ma trận chuyển trạng thái lịch hẹn: không thể nhảy thẳng tới DONATED, không đi lùi, trạng thái cuối không đổi được. */
class AppointmentTransitionTest {

    @Test
    void happyPathGoesThroughEveryStage() {
        assertEquals("CHECKED_IN", AppointmentService.nextStatus("BOOKED", Action.CHECK_IN));
        assertEquals("SCREENED", AppointmentService.nextStatus("CHECKED_IN", Action.SCREEN_PASS));
        assertEquals("DONATED", AppointmentService.nextStatus("SCREENED", Action.DONATED));
    }

    @Test
    void cannotSkipToDonatedFromBookedOrCheckedIn() {
        assertNull(AppointmentService.nextStatus("BOOKED", Action.DONATED));
        assertNull(AppointmentService.nextStatus("CHECKED_IN", Action.DONATED));
        assertNull(AppointmentService.nextStatus("BOOKED", Action.SCREEN_PASS));
    }

    @Test
    void deferralAndNoShow() {
        assertEquals("DEFERRED", AppointmentService.nextStatus("CHECKED_IN", Action.DEFER));
        assertEquals("DEFERRED", AppointmentService.nextStatus("SCREENED", Action.DEFER));
        assertEquals("NO_SHOW", AppointmentService.nextStatus("BOOKED", Action.NO_SHOW));
        assertNull(AppointmentService.nextStatus("CHECKED_IN", Action.NO_SHOW));
    }

    @Test
    void terminalStatesAreFinal() {
        for (String terminal : new String[]{"DONATED", "DEFERRED", "NO_SHOW", "CANCELLED"}) {
            for (Action a : Action.values()) {
                assertNull(AppointmentService.nextStatus(terminal, a), terminal + " + " + a);
            }
        }
    }
}
