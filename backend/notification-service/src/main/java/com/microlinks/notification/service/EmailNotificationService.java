package com.microlinks.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import jakarta.mail.internet.MimeMessage;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailNotificationService {

    private final JavaMailSender mailSender;

    @Value("${microlinks.mail.from:noreply@microlinks.com}")
    private String fromEmail;

    @Value("${microlinks.mail.from-name:MicroLinks Platform}")
    private String fromName;

    public void sendOperationStatusEmail(String reference, String statutLabel,
                                          String donneurOrdre, String beneficiaire,
                                          Object montant, String devise, String prochainActeur) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, fromName);
            helper.setSubject("[MicroLinks] Opération " + reference + " - " + statutLabel);

            String htmlContent = buildEmailHtml(reference, statutLabel, donneurOrdre,
                    beneficiaire, montant, devise, prochainActeur);
            helper.setText(htmlContent, true);

            // Note: En production, l'email du destinataire serait récupéré depuis Keycloak
            // Pour le moment, on logue seulement
            log.info("Email de notification prêt pour opération {} - Statut: {}", reference, statutLabel);
            // mailSender.send(message); // Décommentez quand l'email est configuré

        } catch (Exception e) {
            log.warn("Envoi email non configuré ou erreur: {}", e.getMessage());
        }
    }

    private String buildEmailHtml(String reference, String statut, String donneurOrdre,
                                   String beneficiaire, Object montant, String devise,
                                   String prochainActeur) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; background: #f5f5f5; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
                    .header { background: linear-gradient(135deg, #1e3a5f, #2d6a9f); padding: 30px; text-align: center; }
                    .header h1 { color: white; margin: 0; font-size: 28px; }
                    .header p { color: #a8d4f5; margin: 5px 0 0; }
                    .content { padding: 30px; }
                    .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px;
                                    background: #e3f2fd; color: #1565c0; font-weight: bold; }
                    .detail-row { display: flex; justify-content: space-between; padding: 10px 0;
                                  border-bottom: 1px solid #eee; }
                    .detail-label { color: #666; }
                    .detail-value { font-weight: bold; }
                    .amount { font-size: 24px; color: #1e3a5f; text-align: center; padding: 20px 0; }
                    .next-action { background: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 20px;
                                   border-left: 4px solid #ffc107; }
                    .footer { background: #f5f5f5; padding: 20px; text-align: center; color: #999; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔗 MicroLinks</h1>
                        <p>Plateforme Inter-Institutionnelle de Finance</p>
                    </div>
                    <div class="content">
                        <h2>Mise à jour d'opération</h2>
                        <div class="status-badge">%s</div>
                        <div class="detail-row">
                            <span class="detail-label">Référence</span>
                            <span class="detail-value">%s</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Donneur d'ordre</span>
                            <span class="detail-value">%s</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Bénéficiaire</span>
                            <span class="detail-value">%s</span>
                        </div>
                        <div class="amount">%s %s</div>
                        %s
                    </div>
                    <div class="footer">
                        <p>© 2024 MicroLinks Platform. Tous droits réservés.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(
                statut, reference, donneurOrdre, beneficiaire,
                montant != null ? montant.toString() : "0", devise,
                prochainActeur != null && !prochainActeur.isEmpty()
                    ? "<div class='next-action'><strong>Prochaine action :</strong> " + prochainActeur + "</div>"
                    : ""
            );
    }
}
