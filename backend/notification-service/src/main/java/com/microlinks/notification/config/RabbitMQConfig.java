package com.microlinks.notification.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    @Value("${microlinks.rabbitmq.exchange}")
    private String exchange;

    @Bean
    public TopicExchange operationsExchange() {
        return new TopicExchange(exchange, true, false);
    }

    @Bean
    public Queue operationQueue() {
        return QueueBuilder.durable("microlinks.notifications.queue")
                .withArgument("x-dead-letter-exchange", exchange + ".dlx")
                .build();
    }

    @Bean
    public Binding operationBinding(Queue operationQueue, TopicExchange operationsExchange) {
        return BindingBuilder.bind(operationQueue)
                .to(operationsExchange)
                .with("operation.#");
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
