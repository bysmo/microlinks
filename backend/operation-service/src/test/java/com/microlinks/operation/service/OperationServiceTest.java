package com.microlinks.operation.service;

import com.microlinks.operation.dto.OperationCreateRequest;
import com.microlinks.operation.dto.OperationDto;
import com.microlinks.operation.entity.Operation;
import com.microlinks.operation.entity.StatutOperation;
import com.microlinks.operation.entity.TypeOperation;
import com.microlinks.operation.exception.WorkflowException;
import com.microlinks.operation.repository.HistoriqueStatutRepository;
import com.microlinks.operation.repository.OperationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class OperationServiceTest {

    @Mock
    private OperationRepository operationRepository;

    @Mock
    private HistoriqueStatutRepository historiqueRepository;

    @Mock
    private OperationWorkflowMachine workflowMachine;

    @Mock
    private RabbitTemplate rabbitTemplate;

    @Mock
    private AmlService amlService;

    @InjectMocks
    private OperationService operationService;

    private UUID operationId;
    private UUID institutionId;

    @BeforeEach
    public void setUp() {
        operationId = UUID.randomUUID();
        institutionId = UUID.randomUUID();
    }

    @Test
    public void testCreateOperation_Success() {
        OperationCreateRequest req = new OperationCreateRequest();
        req.setTypeOperation(TypeOperation.VIREMENT);
        req.setDateOperation(LocalDate.now());
        req.setMontant(new BigDecimal("150000"));
        req.setDevise("XOF");
        req.setNomDonneurOrdre("Jean Dupont");
        req.setNomBeneficiaire("Marie Konan");
        req.setInstitutionEmettriceId(institutionId);

        Operation mockSaved = Operation.builder()
                .id(operationId)
                .referenceUnique("ML-VIR-20260616-000001")
                .typeOperation(TypeOperation.VIREMENT)
                .statut(StatutOperation.BROUILLON)
                .montant(new BigDecimal("150000"))
                .nomDonneurOrdre("Jean Dupont")
                .nomBeneficiaire("Marie Konan")
                .build();

        when(operationRepository.save(any(Operation.class))).thenReturn(mockSaved);

        OperationDto result = operationService.create(req, "user-123", "User Test", institutionId);

        assertThat(result).isNotNull();
        assertThat(result.getReferenceUnique()).isEqualTo("ML-VIR-20260616-000001");
        assertThat(result.getStatut()).isEqualTo(StatutOperation.BROUILLON);

        verify(operationRepository).save(any(Operation.class));
    }

    @Test
    public void testSoumettre_AmlMatch_FreezesTransaction() {
        Operation op = Operation.builder()
                .id(operationId)
                .referenceUnique("ML-VIR-20260616-000001")
                .statut(StatutOperation.BROUILLON)
                .nomDonneurOrdre("VLADIMIR PUTIN")
                .nomBeneficiaire("Marie Konan")
                .build();

        when(operationRepository.findById(operationId)).thenReturn(Optional.of(op));
        when(amlService.checkSanctionMatch("VLADIMIR PUTIN")).thenReturn(true);

        Operation mockSuspended = Operation.builder()
                .id(operationId)
                .referenceUnique("ML-VIR-20260616-000001")
                .statut(StatutOperation.SUSPENDU_AML)
                .build();
        when(operationRepository.save(any(Operation.class))).thenReturn(mockSuspended);

        OperationDto result = operationService.soumettre(operationId, "Submission comment", "user-1", "User 1", institutionId);

        assertThat(result).isNotNull();
        assertThat(result.getStatut()).isEqualTo(StatutOperation.SUSPENDU_AML);
        verify(workflowMachine).validateTransition(StatutOperation.BROUILLON, StatutOperation.SUSPENDU_AML);
    }

    @Test
    public void testValider_CreatorCannotValidate_ThrowsWorkflowException() {
        Operation op = Operation.builder()
                .id(operationId)
                .statut(StatutOperation.SOUMIS)
                .creePar("creator-user")
                .build();

        when(operationRepository.findById(operationId)).thenReturn(Optional.of(op));

        assertThatThrownBy(() -> operationService.valider(operationId, StatutOperation.ACCEPTE_EMETTEUR, "Ok", "creator-user", "Creator", institutionId))
                .isInstanceOf(WorkflowException.class)
                .hasMessageContaining("Le créateur de l'opération ne peut pas la valider");
    }
}
