package com.microlinks.notification.consumer;

import com.microlinks.notification.service.EmailNotificationService;
import com.microlinks.notification.service.WebSocketNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import java.util.HashMap;
import java.util.Map;

/**
 * Consomme les événements de facturation publiés par billing-service et
 * envoie les alertes (email + in-app) aux administrateurs d'institution.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BillingEventConsumer {

    private final EmailNotificationService emailService;
    private final WebSocketNotificationService wsService;

    @RabbitListener(queues = "microlinks.billing.notifications.queue")
    public void handleBillingEvent(Map<String, Object> event) {
        try {
            String type = str(event.get("type"));
            String message = str(event.get("message"));
            String institutionNom = str(event.get("institutionNom"));
            String institutionEmail = str(event.get("institutionEmail"));
            String numero = str(event.get("numero"));
            String periode = str(event.get("periode"));
            String montant = str(event.get("montantTotal"));
            String devise = str(event.get("devise"));
            String dateEcheance = str(event.get("dateEcheance"));
            String institutionId = str(event.get("institutionId"));

            log.info("Événement facturation reçu [{}] institution {}", type, institutionNom);

            // Notification email à l'admin de l'institution
            emailService.sendBillingEmail(type, message, institutionNom, institutionEmail,
                    numero, periode, montant, devise, dateEcheance);

            // Notification in-app (WebSocket) ciblée sur l'institution
            if (institutionId != null) {
                Map<String, Object> payload = new HashMap<>();
                payload.put("type", type);
                payload.put("message", message);
                payload.put("numero", numero);
                payload.put("periode", periode);
                payload.put("montant", montant);
                payload.put("devise", devise);
                wsService.sendOperationUpdate("billing-" + institutionId, payload);
            }
        } catch (Exception e) {
            log.error("Erreur traitement événement facturation", e);
        }
    }

    private String str(Object o) {
        return o != null ? o.toString() : null;
    }
}
