package com.microlinks.institution.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Test unitaire validant le mécanisme de hachage de code PIN dans KeycloakProvisioningService.
 */
@ExtendWith(MockitoExtension.class)
public class KeycloakPinValidationTest {

    @Mock
    private RabbitTemplate rabbitTemplate;

    @Test
    public void testPinHashing() {
        // Le constructeur de KeycloakProvisioningService requiert uniquement RabbitTemplate
        KeycloakProvisioningService service = new KeycloakProvisioningService(rabbitTemplate);
        
        String pin = "1234";
        String hashed = service.hashPin(pin);
        
        assertNotNull(hashed);
        assertEquals(64, hashed.length());
        // Vérifier l'empreinte SHA-256 de "1234"
        assertEquals("03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4", hashed);
    }
}
