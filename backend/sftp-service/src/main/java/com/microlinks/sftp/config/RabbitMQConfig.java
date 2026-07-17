package com.microlinks.sftp.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration RabbitMQ pour le sftp-service.
 *
 * Exchange : sftp.exchange (topic)
 *
 * Routing keys :
 *   - sftp.fichier.collecte    → fichier récupéré d'un répertoire d'envoi institution
 *   - sftp.fichier.depose      → fichier déposé dans le répertoire de réception institution
 *   - sftp.fichier.erreur      → erreur lors du traitement d'un fichier
 *
 * Ces messages sont consommés par le notification-service pour l'envoi d'emails.
 */
@Configuration
public class RabbitMQConfig {

    public static final String SFTP_EXCHANGE      = "sftp.exchange";
    public static final String SFTP_COLLECTE_KEY  = "sftp.fichier.collecte";
    public static final String SFTP_DEPOSE_KEY    = "sftp.fichier.depose";
    public static final String SFTP_ERREUR_KEY    = "sftp.fichier.erreur";

    public static final String SFTP_NOTIFICATION_QUEUE = "sftp.notification.queue";

    @Bean
    public TopicExchange sftpExchange() {
        return new TopicExchange(SFTP_EXCHANGE, true, false);
    }

    /** Queue consommée par le notification-service pour envoyer les emails */
    @Bean
    public Queue sftpNotificationQueue() {
        return QueueBuilder.durable(SFTP_NOTIFICATION_QUEUE).build();
    }

    /** Binding : sftp.fichier.depose → notification queue */
    @Bean
    public Binding sftpNotificationBinding(Queue sftpNotificationQueue, TopicExchange sftpExchange) {
        return BindingBuilder.bind(sftpNotificationQueue)
                .to(sftpExchange)
                .with(SFTP_DEPOSE_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory,
                                          MessageConverter jsonMessageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter);
        return template;
    }
}
