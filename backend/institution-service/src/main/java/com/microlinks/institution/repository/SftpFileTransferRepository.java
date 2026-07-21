package com.microlinks.institution.repository;

import com.microlinks.institution.entity.SftpFileTransfer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Repository
public interface SftpFileTransferRepository extends JpaRepository<SftpFileTransfer, UUID> {

    Page<SftpFileTransfer> findAllByOrderByTimestampDesc(Pageable pageable);

    long countByStatut(String statut);

    long countByTypeEvenementAndStatut(String typeEvenement, String statut);

    @Query("SELECT t.statut as statut, COUNT(t) as count FROM SftpFileTransfer t GROUP BY t.statut")
    List<Map<String, Object>> countGroupByStatut();

    @Query("SELECT t.typeEvenement as typeEvenement, t.statut as statut, COUNT(t) as count FROM SftpFileTransfer t GROUP BY t.typeEvenement, t.statut")
    List<Map<String, Object>> countGroupByTypeEvenementAndStatut();
}
