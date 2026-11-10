package com.lifely.matching;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface MatchEventRepository extends JpaRepository<MatchEvent, UUID> {

    /** Mỗi dòng: [matchId, số lần nhắc, thời điểm nhắc gần nhất]. */
    @Query("""
            select e.matchId, count(e), max(e.createdAt) from MatchEvent e
             where e.matchId in :ids and e.eventType = 'REMINDED' group by e.matchId
            """)
    List<Object[]> remindStats(@Param("ids") Collection<UUID> ids);
}
