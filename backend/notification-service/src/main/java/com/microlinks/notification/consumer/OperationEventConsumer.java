package com.microlinks.notification.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.microlinks.notification.service.EmailNotificationService;
import com.microlinks.notification.service.WebSocketNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class OperationEventConsumer {

    private final EmailNotificationService emailService;
    private final WebSocketNotificationService wsService;
    private final ObjectMapper objectMapper;

    @RabbitListener(queues = "#{@operationQueue.name}")
    public void handleOperationEvent(Map<String, Object> event) {
        try {
            log.info("Événement reçu: {} -> {}",
                    event.get("statutAvant"), event.get("statutApres"));

            String referenceUnique = (String) event.get("referenceUnique");
            String statutApres = (String) event.get("statutApres");
            String statutLabel = (String) event.get("statutLabel");
            String prochainActeur = (String) event.get("prochainActeur");
            String nomDonneurOrdre = (String) event.get("nomDonneurOrdre");
            String nomBeneficiaire = (String) event.get("nomBeneficiaire");
            Object montant = event.get("montant");
            String devise = (String) event.get("devise");

            // Notification WebSocket (in-app)
            wsService.sendOperationUpdate(referenceUnique, Map.of(
                "referenceUnique", referenceUnique,
                "statut", statutApres,
                "statutLabel", statutLabel != null ? statutLabel : "",
                "prochainActeur", prochainActeur != null ? prochainActeur : "",
                "nomDonneurOrdre", nomDonneurOrdre != null ? nomDonneurOrdre : "",
                "nomBeneficiaire", nomBeneficiaire != null ? nomBeneficiaire : "",
                "montant", montant != null ? montant.toString() : "0",
                "devise", devise != null ? devise : ""
            ));

            // Notification Email (si configuré)
            if (shouldSendEmail(statutApres)) {
                emailService.sendOperationStatusEmail(
                    referenceUnique, statutLabel, nomDonneurOrdre,
                    nomBeneficiaire, montant, devise, prochainActeur
                );
            }

        } catch (Exception e) {
            log.error("Erreur traitement événement opération", e);
        }
    }

    private boolean shouldSendEmail(String statut) {
        return statut != null && (
            statut.equals("COMPTABILISE") ||
            statut.equals("REJETE") ||
            statut.equals("REJETE_EMETTEUR") ||
            statut.equals("ANNULE")
        );
    }
}
