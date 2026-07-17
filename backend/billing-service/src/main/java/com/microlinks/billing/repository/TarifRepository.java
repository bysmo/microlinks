package com.microlinks.billing.repository;

import com.microlinks.billing.entity.Tarif;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface TarifRepository extends JpaRepository<Tarif, UUID> {
    List<Tarif> findByActifTrue();
}
