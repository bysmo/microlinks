package com.microlinks.notification.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.microlinks.notification.service.EmailNotificationService;
import com.microlinks.notification.service.WebSocketNotificationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class OperationEventConsumerTest {

    @Mock
    private EmailNotificationService emailService;

    @Mock
    private WebSocketNotificationService wsService;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private OperationEventConsumer eventConsumer;

    @Test
    public void testHandleOperationEvent_Comptabilise_TriggersWebSocketAndEmail() {
        Map<String, Object> event = new HashMap<>();
        event.put("referenceUnique", "ML-VIR-123");
        event.put("statutAvant", "ACCEPTE_BENEFICIAIRE");
        event.put("statutApres", "COMPTABILISE");
        event.put("statutLabel", "Comptabilisé");
        event.put("prochainActeur", "");
        event.put("nomDonneurOrdre", "Jean");
        event.put("nomBeneficiaire", "Marie");
        event.put("montant", 15000);
        event.put("devise", "XOF");

        eventConsumer.handleOperationEvent(event);

        // Verify WebSocket update is sent
        verify(wsService).sendOperationUpdate(eq("ML-VIR-123"), any(Map.class));

        // Verify Email is sent (since statut is COMPTABILISE)
        verify(emailService).sendOperationStatusEmail(
                eq("ML-VIR-123"), eq("Comptabilisé"), eq("Jean"),
                eq("Marie"), eq(15000), eq("XOF"), eq("")
        );
    }

    @Test
    public void testHandleOperationEvent_Soumis_TriggersWebSocketOnly() {
        Map<String, Object> event = new HashMap<>();
        event.put("referenceUnique", "ML-VIR-123");
        event.put("statutAvant", "BROUILLON");
        event.put("statutApres", "SOUMIS");
        event.put("statutLabel", "Soumis");
        event.put("prochainActeur", "Valideur");
        event.put("nomDonneurOrdre", "Jean");
        event.put("nomBeneficiaire", "Marie");
        event.put("montant", 15000);
        event.put("devise", "XOF");

        eventConsumer.handleOperationEvent(event);

        verify(wsService).sendOperationUpdate(eq("ML-VIR-123"), any(Map.class));

        // Verify Email is NOT sent for SOUMIS
        verifyNoInteractions(emailService);
    }
}
