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

    /**
     * Envoie un email à l'administrateur d'une institution concernant sa facturation.
     */
    public void sendBillingEmail(String type, String message, String institutionNom,
                                 String destinataire, String numero, String periode,
                                 String montant, String devise, String dateEcheance) {
        try {
            String subject = "[MicroLinks] " + message
                    + (numero != null ? " - Facture " + numero : "");

            String htmlContent = buildBillingHtml(type, message, institutionNom,
                    numero, periode, montant, devise, dateEcheance);

            if (destinataire != null && !destinataire.isBlank()
                    && fromEmail != null && !fromEmail.isBlank()) {
                MimeMessage mimeMessage = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
                helper.setFrom(fromEmail, fromName);
                helper.setTo(destinataire);
                helper.setSubject(subject);
                helper.setText(htmlContent, true);
                // mailSender.send(mimeMessage); // Activer une fois SMTP configuré
                log.info("Email facturation prêt pour {} -> {} ({})", institutionNom, destinataire, message);
            } else {
                log.info("Email facturation [{}] pour institution {} - destinataire non configuré", message, institutionNom);
            }
        } catch (Exception e) {
            log.warn("Envoi email facturation non configuré ou erreur: {}", e.getMessage());
        }
    }

    private String buildBillingHtml(String type, String message, String institutionNom,
                                    String numero, String periode, String montant,
                                    String devise, String dateEcheance) {
        boolean alert = type != null && (type.contains("overdue") || type.contains("deactivated"));
        String accent = alert ? "#c0392b" : "#1e40af";
        return """
            <!DOCTYPE html>
            <html><head><meta charset="UTF-8"></head>
            <body style="font-family: Arial, sans-serif; background:#f5f5f5; margin:0; padding:20px;">
              <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
                <div style="background:%s;padding:24px;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:22px;">🔗 MicroLinks</h1>
                  <p style="color:#dbeafe;margin:6px 0 0;">Facturation</p>
                </div>
                <div style="padding:24px;color:#334155;">
                  <h2 style="margin-top:0;">%s</h2>
                  <p>Bonjour <strong>%s</strong>,</p>
                  <table style="width:100%%;border-collapse:collapse;">
                    <tr><td style="padding:8px 0;color:#666;">Facture</td><td style="text-align:right;font-weight:bold;">%s</td></tr>
                    <tr><td style="padding:8px 0;color:#666;">Période</td><td style="text-align:right;font-weight:bold;">%s</td></tr>
                    <tr><td style="padding:8px 0;color:#666;">Montant</td><td style="text-align:right;font-weight:bold;">%s %s</td></tr>
                    <tr><td style="padding:8px 0;color:#666;">Échéance</td><td style="text-align:right;font-weight:bold;">%s</td></tr>
                  </table>
                  <p style="margin-top:20px;">Connectez-vous à votre espace MicroLinks, rubrique « Mes factures », pour consulter le détail.</p>
                </div>
                <div style="background:#f5f5f5;padding:16px;text-align:center;color:#999;font-size:12px;">
                  <p style="margin:0;">© 2024 MicroLinks Platform.</p>
                </div>
              </div>
            </body></html>
            """.formatted(
                accent,
                message != null ? message : "Notification de facturation",
                institutionNom != null ? institutionNom : "",
                numero != null ? numero : "-",
                periode != null ? periode : "-",
                montant != null ? montant : "0",
                devise != null ? devise : "",
                dateEcheance != null ? dateEcheance : "-"
            );
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

    public void sendUserCreationEmail(String destinataire, String firstName, String lastName,
                                      String username, String tempPassword, String institutionNom) {
        try {
            String subject = "[MicroLinks] Création de votre compte utilisateur";
            String htmlContent = buildUserCreationHtml(firstName, lastName, username, tempPassword, institutionNom);

            if (destinataire != null && !destinataire.isBlank()
                    && fromEmail != null && !fromEmail.isBlank()) {
                MimeMessage mimeMessage = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
                helper.setFrom(fromEmail, fromName);
                helper.setTo(destinataire);
                helper.setSubject(subject);
                helper.setText(htmlContent, true);
                
                // mailSender.send(mimeMessage); // Activer une fois SMTP configuré
                log.info("Email création utilisateur prêt pour {} -> {} (Username: {}, TempPassword: {})", 
                        firstName + " " + lastName, destinataire, username, tempPassword);
            } else {
                log.warn("Email création utilisateur non envoyé : destinataire ou expéditeur vide");
            }
        } catch (Exception e) {
            log.warn("Envoi email création utilisateur non configuré ou erreur: {}", e.getMessage());
        }
    }

    private String buildUserCreationHtml(String firstName, String lastName, String username,
                                         String tempPassword, String institutionNom) {
        return """
            <!DOCTYPE html>
            <html><head><meta charset="UTF-8"></head>
            <body style="font-family: Arial, sans-serif; background:#f5f5f5; margin:0; padding:20px;">
              <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
                <div style="background:#1e3a5f;padding:24px;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:22px;">🔗 MicroLinks</h1>
                  <p style="color:#dbeafe;margin:6px 0 0;">Création de compte</p>
                </div>
                <div style="padding:24px;color:#334155;">
                  <p>Bonjour <strong>%s %s</strong>,</p>
                  <p>Un compte utilisateur a été créé pour vous au sein de l'établissement <strong>%s</strong> sur la plateforme MicroLinks.</p>
                  
                  <p>Voici vos identifiants temporaires de connexion :</p>
                  <table style="width:100%%;border-collapse:collapse;margin:15px 0;">
                    <tr><td style="padding:8px 0;color:#666;width:150px;">Identifiant (Username)</td><td style="font-weight:bold;">%s</td></tr>
                    <tr><td style="padding:8px 0;color:#666;">Mot de passe temporaire</td><td style="font-weight:bold;font-family:monospace;background:#f1f5f9;padding:4px 8px;border-radius:4px;">%s</td></tr>
                  </table>
                  
                  <p style="margin-top:20px;">Pour activer votre compte et définir votre mot de passe définitif, connectez-vous dès maintenant à la plateforme en cliquant sur le lien ci-dessous :</p>
                  <div style="text-align:center;margin:30px 0;">
                    <a href="http://localhost:3000" style="background:#f3c623;color:#0f172a;padding:12px 24px;font-weight:bold;text-decoration:none;border-radius:6px;display:inline-block;">Se connecter à MicroLinks</a>
                  </div>
                  
                  <p style="color:#ef4444;font-size:13px;font-weight:medium;">Note : Pour des raisons de sécurité, vous serez invité à changer ce mot de passe dès votre première connexion.</p>
                </div>
                <div style="background:#f5f5f5;padding:16px;text-align:center;color:#999;font-size:12px;">
                  <p style="margin:0;">© 2026 MicroLinks Platform. Tous droits réservés.</p>
                </div>
              </div>
            </body></html>
            """.formatted(
                firstName != null ? firstName : "",
                lastName != null ? lastName : "",
                institutionNom != null ? institutionNom : "",
                username != null ? username : "",
                tempPassword != null ? tempPassword : ""
            );
    }
}
