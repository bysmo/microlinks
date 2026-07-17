package com.microlinks.notification.consumer;

import com.microlinks.notification.service.EmailNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import java.util.Map;

/**
 * Consomme les événements liés aux utilisateurs (création) publiés par
 * le service d'institution et envoie les emails correspondants.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class UserEventConsumer {

    private final EmailNotificationService emailService;

    @RabbitListener(queues = "microlinks.users.notifications.queue")
    public void handleUserEvent(Map<String, Object> event) {
        try {
            String type = (String) event.get("type");
            log.info("Événement utilisateur reçu de type : {}", type);

            if ("CREATED".equals(type)) {
                String username = (String) event.get("username");
                String email = (String) event.get("email");
                String firstName = (String) event.get("firstName");
                String lastName = (String) event.get("lastName");
                String tempPassword = (String) event.get("tempPassword");
                String institutionNom = (String) event.get("institutionNom");

                log.info("Traitement de l'email de création pour le collaborateur {} (Username: {})", 
                        firstName + " " + lastName, username);
                
                emailService.sendUserCreationEmail(email, firstName, lastName, username, tempPassword, institutionNom);
            }
        } catch (Exception e) {
            log.error("Erreur lors du traitement de l'événement utilisateur", e);
        }
    }
}
