package com.microlinks.billing.service;

import com.microlinks.billing.entity.Facture;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.Map;

/**
 * Publie les événements de facturation vers notification-service via RabbitMQ.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BillingNotificationPublisher {

    private final RabbitTemplate rabbitTemplate;

    @Value("${microlinks.rabbitmq.billing-exchange}")
    private String billingExchange;

    public void publishInvoiceCreated(Facture f) {
        publish("billing.invoice.created", f, "Nouvelle facture émise");
    }

    public void publishInvoiceOverdue(Facture f) {
        publish("billing.invoice.overdue", f, "Facture en retard de paiement");
    }

    public void publishInstitutionDeactivated(Facture f) {
        publish("billing.institution.deactivated", f, "Institution désactivée pour impayé");
    }

    private void publish(String routingKey, Facture f, String message) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("type", routingKey);
            event.put("message", message);
            event.put("factureId", f.getId() != null ? f.getId().toString() : null);
            event.put("numero", f.getNumero());
            event.put("institutionId", f.getInstitutionId() != null ? f.getInstitutionId().toString() : null);
            event.put("institutionNom", f.getInstitutionNom());
            event.put("institutionEmail", f.getInstitutionEmail());
            event.put("periode", f.getPeriode());
            event.put("montantTotal", f.getMontantTotal() != null ? f.getMontantTotal().toString() : "0");
            event.put("devise", f.getDevise());
            event.put("dateEcheance", f.getDateEcheance() != null ? f.getDateEcheance().toString() : null);
            rabbitTemplate.convertAndSend(billingExchange, routingKey, event);
            log.info("Événement facturation publié [{}] facture {}", routingKey, f.getNumero());
        } catch (Exception e) {
            log.warn("Échec publication événement facturation {}: {}", routingKey, e.getMessage());
        }
    }
}
