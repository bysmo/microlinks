package com.microlinks.institution.repository;

import com.microlinks.institution.entity.ZoneMonetaire;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ZoneMonetaireRepository extends JpaRepository<ZoneMonetaire, UUID> {
    Optional<ZoneMonetaire> findByCode(String code);
    List<ZoneMonetaire> findByStatutOrderByLibelleAsc(com.microlinks.institution.entity.StatutEntite statut);
}
