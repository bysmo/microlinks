package com.microlinks.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebSocketNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Envoie une notification de mise à jour d'opération à tous les abonnés.
     * Le topic /topic/operations est accessible à tous les agents connectés.
     */
    public void sendOperationUpdate(String referenceUnique, Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/operations", payload);
        log.debug("WebSocket notification envoyée pour opération: {}", referenceUnique);
    }

    /**
     * Envoie une notification ciblée à un utilisateur spécifique.
     */
    public void sendUserNotification(String userId, Map<String, Object> payload) {
        messagingTemplate.convertAndSendToUser(userId, "/queue/notifications", payload);
        log.debug("WebSocket notification privée envoyée à: {}", userId);
    }
}
