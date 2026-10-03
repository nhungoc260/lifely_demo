package com.lifely.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PrivacySettingsRepository extends JpaRepository<PrivacySettings, UUID> {
}
