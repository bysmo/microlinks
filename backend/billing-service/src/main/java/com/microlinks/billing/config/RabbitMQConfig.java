package com.microlinks.billing.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    @Value("${microlinks.rabbitmq.operations-exchange}")
    private String operationsExchange;

    @Value("${microlinks.rabbitmq.billing-exchange}")
    private String billingExchange;

    // ---- Exchange des opérations (consommation pour compter les opérations) ----
    @Bean
    public TopicExchange operationsExchange() {
        return new TopicExchange(operationsExchange, true, false);
    }

    @Bean
    public Queue billingOperationQueue() {
        return QueueBuilder.durable("microlinks.billing.operations.queue").build();
    }

    @Bean
    public Binding billingOperationBinding(Queue billingOperationQueue, TopicExchange operationsExchange) {
        return BindingBuilder.bind(billingOperationQueue).to(operationsExchange).with("operation.#");
    }

    // ---- Exchange de facturation (publication d'événements vers notification-service) ----
    @Bean
    public TopicExchange billingExchange() {
        return new TopicExchange(billingExchange, true, false);
    }

    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory cf) {
        RabbitTemplate template = new RabbitTemplate(cf);
        template.setMessageConverter(messageConverter());
        return template;
    }
}
