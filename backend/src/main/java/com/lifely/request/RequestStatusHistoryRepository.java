package com.lifely.request;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RequestStatusHistoryRepository extends JpaRepository<RequestStatusHistory, UUID> {

    List<RequestStatusHistory> findByRequestIdOrderByCreatedAtAsc(UUID requestId);
}
