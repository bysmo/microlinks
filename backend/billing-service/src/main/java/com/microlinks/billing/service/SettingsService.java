package com.microlinks.billing.service;

import com.microlinks.billing.dto.BillingSettingsRequest;
import com.microlinks.billing.entity.BillingSettings;
import com.microlinks.billing.repository.BillingSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SettingsService {

    private final BillingSettingsRepository settingsRepository;

    public BillingSettings get() {
        return settingsRepository.findById(1).orElseGet(() ->
                settingsRepository.save(BillingSettings.builder()
                        .id(1)
                        .delaiDesactivationJours(15)
                        .autoDesactivationActive(true)
                        .jourGeneration(1)
                        .delaiPaiementJours(30)
                        .updatedBy("system")
                        .build()));
    }

    public BillingSettings update(BillingSettingsRequest req, String user) {
        BillingSettings s = get();
        s.setDelaiDesactivationJours(req.getDelaiDesactivationJours());
        s.setAutoDesactivationActive(req.getAutoDesactivationActive());
        s.setJourGeneration(req.getJourGeneration());
        s.setDelaiPaiementJours(req.getDelaiPaiementJours());
        s.setUpdatedBy(user);
        return settingsRepository.save(s);
    }
}
