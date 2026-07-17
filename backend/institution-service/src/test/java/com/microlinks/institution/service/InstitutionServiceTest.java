package com.microlinks.institution.service;

import com.microlinks.institution.dto.InstitutionCreateRequest;
import com.microlinks.institution.dto.InstitutionDto;
import com.microlinks.institution.entity.Institution;
import com.microlinks.institution.entity.StatutEntite;
import com.microlinks.institution.entity.TypeInstitution;
import com.microlinks.institution.entity.ZoneMonetaire;
import com.microlinks.institution.exception.BusinessException;
import com.microlinks.institution.exception.ResourceNotFoundException;
import com.microlinks.institution.repository.InstitutionRepository;
import com.microlinks.institution.repository.ZoneMonetaireRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class InstitutionServiceTest {

    @Mock
    private InstitutionRepository institutionRepository;

    @Mock
    private ZoneMonetaireRepository zoneMonetaireRepository;

    @Mock
    private KeycloakProvisioningService keycloakProvisioningService;

    @InjectMocks
    private InstitutionService institutionService;

    private ZoneMonetaire zoneMonetaire;
    private UUID zoneId;
    private UUID institutionId;

    @BeforeEach
    public void setUp() {
        zoneId = UUID.randomUUID();
        institutionId = UUID.randomUUID();

        zoneMonetaire = new ZoneMonetaire();
        zoneMonetaire.setId(zoneId);
        zoneMonetaire.setCode("XOF");
        zoneMonetaire.setDevise("FCFA");
        zoneMonetaire.setLibelle("Union Monétaire Ouest Africaine");
    }

    @Test
    public void testCreateBanque_Success() {
        InstitutionCreateRequest req = new InstitutionCreateRequest();
        req.setCode("SGBS");
        req.setNom("Société Générale");
        req.setTypeInstitution(TypeInstitution.BANQUE);
        req.setZoneMonetaireId(zoneId);
        req.setPays("SEN");
        req.setCodeBanqueRegional("SG001");
        req.setCodeBic("SGBSDAAA");
        req.setCodeParticipantRtgs("RTGS-SG");

        Institution mockSaved = Institution.builder()
                .id(institutionId)
                .code("SGBS")
                .nom("Société Générale")
                .typeInstitution(TypeInstitution.BANQUE)
                .zoneMonetaire(zoneMonetaire)
                .pays("SEN")
                .statut(StatutEntite.INACTIF)
                .build();

        when(institutionRepository.existsByCode("SGBS")).thenReturn(false);
        when(zoneMonetaireRepository.findById(zoneId)).thenReturn(Optional.of(zoneMonetaire));
        when(institutionRepository.save(any(Institution.class))).thenReturn(mockSaved);

        InstitutionDto result = institutionService.create(req, "test-user");

        assertThat(result).isNotNull();
        assertThat(result.getCode()).isEqualTo("SGBS");
        assertThat(result.getTypeInstitution()).isEqualTo(TypeInstitution.BANQUE);
        assertThat(result.getStatut()).isEqualTo(StatutEntite.INACTIF);

        verify(institutionRepository).save(any(Institution.class));
    }

    @Test
    public void testCreateBanque_MissingFields_ThrowsException() {
        InstitutionCreateRequest req = new InstitutionCreateRequest();
        req.setCode("SGBS");
        req.setTypeInstitution(TypeInstitution.BANQUE);
        req.setZoneMonetaireId(zoneId);
        req.setPays("SEN");

        when(institutionRepository.existsByCode("SGBS")).thenReturn(false);
        when(zoneMonetaireRepository.findById(zoneId)).thenReturn(Optional.of(zoneMonetaire));

        assertThatThrownBy(() -> institutionService.create(req, "test-user"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Le code banque régional est obligatoire");
    }

    @Test
    public void testCreateMicrofinance_GeneratesCodeMicrolink() {
        InstitutionCreateRequest req = new InstitutionCreateRequest();
        req.setCode("PAMEC");
        req.setNom("Pamecas");
        req.setTypeInstitution(TypeInstitution.MICRO_FINANCE);
        req.setZoneMonetaireId(zoneId);
        req.setPays("SEN");

        Institution mockSaved = Institution.builder()
                .id(institutionId)
                .code("PAMEC")
                .typeInstitution(TypeInstitution.MICRO_FINANCE)
                .zoneMonetaire(zoneMonetaire)
                .pays("SEN")
                .codeMicrolink("ML-SEN-0001")
                .statut(StatutEntite.INACTIF)
                .build();

        when(institutionRepository.existsByCode("PAMEC")).thenReturn(false);
        when(zoneMonetaireRepository.findById(zoneId)).thenReturn(Optional.of(zoneMonetaire));
        when(institutionRepository.countByPaysAndTypeInstitutionIn(anyString(), anyList())).thenReturn(0L);
        when(institutionRepository.save(any(Institution.class))).thenReturn(mockSaved);

        InstitutionDto result = institutionService.create(req, "test-user");

        assertThat(result).isNotNull();
        assertThat(result.getCodeMicrolink()).isEqualTo("ML-SEN-0001");
    }

    @Test
    public void testChangerStatut_ToActif_ProvisionKeycloak() {
        Institution inst = Institution.builder()
                .id(institutionId)
                .code("SGBS")
                .statut(StatutEntite.INACTIF)
                .build();

        when(institutionRepository.findById(institutionId)).thenReturn(Optional.of(inst));

        institutionService.changerStatut(institutionId, StatutEntite.ACTIF, "admin");

        assertThat(inst.getStatut()).isEqualTo(StatutEntite.ACTIF);
        verify(keycloakProvisioningService).provisionUsersForInstitution(inst);
        verify(institutionRepository).save(inst);
    }
}
