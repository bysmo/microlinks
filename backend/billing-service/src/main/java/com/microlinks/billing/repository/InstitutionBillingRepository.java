package com.microlinks.billing.repository;

import com.microlinks.billing.entity.InstitutionBilling;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InstitutionBillingRepository extends JpaRepository<InstitutionBilling, UUID> {
    Optional<InstitutionBilling> findByInstitutionId(UUID institutionId);
    List<InstitutionBilling> findByActifTrue();
}
