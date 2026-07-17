package com.microlinks.institution.repository;

import com.microlinks.institution.entity.CompteCorrespondance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface CompteCorrespondanceRepository extends JpaRepository<CompteCorrespondance, UUID> {
    List<CompteCorrespondance> findByInstitutionProprietaireId(UUID institutionId);
    List<CompteCorrespondance> findByInstitutionProprietaireIdAndStatut(UUID institutionId, com.microlinks.institution.entity.StatutEntite statut);
}
