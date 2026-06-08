package com.microlinks.operation.repository;

import com.microlinks.operation.entity.HistoriqueStatut;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface HistoriqueStatutRepository extends JpaRepository<HistoriqueStatut, UUID> {
    List<HistoriqueStatut> findByOperationIdOrderByDateActionAsc(UUID operationId);
}
