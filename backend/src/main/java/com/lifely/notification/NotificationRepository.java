package com.lifely.notification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    Page<Notification> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    Page<Notification> findByUserIdAndReadFlagFalseOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    long countByUserIdAndReadFlagFalse(UUID userId);

    @Modifying
    @Query("update Notification n set n.readFlag = true where n.userId = :userId and n.readFlag = false")
    int markAllRead(@Param("userId") UUID userId);
}
