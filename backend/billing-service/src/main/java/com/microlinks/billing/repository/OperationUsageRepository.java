package com.microlinks.billing.repository;

import com.microlinks.billing.entity.OperationUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface OperationUsageRepository extends JpaRepository<OperationUsage, UUID> {
    Optional<OperationUsage> findByInstitutionIdAndPeriode(UUID institutionId, String periode);
}
