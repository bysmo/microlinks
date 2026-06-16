package com.microlinks.operation.service;

import com.microlinks.operation.entity.StatutOperation;
import com.microlinks.operation.exception.WorkflowException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

public class OperationWorkflowMachineTest {

    private final OperationWorkflowMachine workflowMachine = new OperationWorkflowMachine();

    @Test
    public void testValidateTransition_Success() {
        // BROUILLON can transition to SOUMIS, SUSPENDU_AML, ANNULE
        workflowMachine.validateTransition(StatutOperation.BROUILLON, StatutOperation.SOUMIS);
        workflowMachine.validateTransition(StatutOperation.BROUILLON, StatutOperation.SUSPENDU_AML);
        workflowMachine.validateTransition(StatutOperation.BROUILLON, StatutOperation.ANNULE);
    }

    @Test
    public void testValidateTransition_Failure_ThrowsWorkflowException() {
        // BROUILLON cannot transition to COMPTABILISE directly
        assertThatThrownBy(() -> workflowMachine.validateTransition(StatutOperation.BROUILLON, StatutOperation.COMPTABILISE))
                .isInstanceOf(WorkflowException.class)
                .hasMessageContaining("Transition non autorisée");
    }

    @Test
    public void testGetStatutLabel() {
        assertThat(workflowMachine.getStatutLabel(StatutOperation.BROUILLON)).isEqualTo("Brouillon");
        assertThat(workflowMachine.getStatutLabel(StatutOperation.COMPTABILISE)).isEqualTo("Comptabilisé avec succès");
    }

    @Test
    public void testGetProchainActeur() {
        assertThat(workflowMachine.getProchainActeur(StatutOperation.SOUMIS)).contains("L'agent de validation");
        assertThat(workflowMachine.getProchainActeur(StatutOperation.COMPTABILISE)).isEmpty();
    }
}
