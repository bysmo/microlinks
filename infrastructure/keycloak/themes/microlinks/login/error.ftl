<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>
    <#if section = "header">
        <div class="login-brand">
            <span class="brand-micro">Micro</span><span class="brand-links">Links</span>
        </div>
        <p class="login-subtitle text-red-500">Une erreur est survenue</p>
    <#elseif section = "form">
        <div class="login-box">
            <div class="error-wrapper">
                <div class="error-icon-circle">⚠️</div>
                <h3 class="error-title">Erreur d'authentification</h3>
                <p class="error-message">${message.summary}</p>
            </div>
            
            <#if client?? && client.baseUrl??>
                <a href="${client.baseUrl}" class="btn btn-primary btn-block back-btn">
                    Retour à l'application
                </a>
            <#else>
                <a href="${url.loginUrl}" class="btn btn-primary btn-block back-btn">
                    Retour à la connexion
                </a>
            </#if>
        </div>
    </#if>
</@layout.registrationLayout>
