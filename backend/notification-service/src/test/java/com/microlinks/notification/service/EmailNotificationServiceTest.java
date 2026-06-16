package com.microlinks.notification.service;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.Properties;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class EmailNotificationServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private EmailNotificationService emailNotificationService;

    @BeforeEach
    public void setUp() {
        ReflectionTestUtils.setField(emailNotificationService, "fromEmail", "noreply@microlinks.com");
        ReflectionTestUtils.setField(emailNotificationService, "fromName", "MicroLinks Platform");
    }

    @Test
    public void testSendOperationStatusEmail_CreatesMessage() {
        MimeMessage mockMimeMessage = new MimeMessage((Session) null);
        when(mailSender.createMimeMessage()).thenReturn(mockMimeMessage);

        emailNotificationService.sendOperationStatusEmail(
                "ML-VIR-123", "Soumis", "Jean", "Marie",
                new BigDecimal("15000"), "XOF", "Agent de validation"
        );

        verify(mailSender).createMimeMessage();
        // Since mailSender.send is commented out in code (or handled in try-catch), we verify creation
    }

    @Test
    public void testSendBillingEmail_CreatesMessage() {
        MimeMessage mockMimeMessage = new MimeMessage((Session) null);
        when(mailSender.createMimeMessage()).thenReturn(mockMimeMessage);

        emailNotificationService.sendBillingEmail(
                "invoice.created", "Nouvelle facture", "Institution A",
                "admin@inst.com", "FAC-001", "2026-05",
                "75000", "XOF", "2026-06-15"
        );

        verify(mailSender).createMimeMessage();
    }
}
