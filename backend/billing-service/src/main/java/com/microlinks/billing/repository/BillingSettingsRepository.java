package com.microlinks.billing.repository;

import com.microlinks.billing.entity.BillingSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BillingSettingsRepository extends JpaRepository<BillingSettings, Integer> {
}
